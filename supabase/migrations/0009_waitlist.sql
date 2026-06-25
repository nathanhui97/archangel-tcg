-- Pre-launch: beta waitlist (powers the Bindar Landing page)
--
-- Apply this in the Supabase SQL Editor (or via `supabase db push` later).
-- Run order matters — RLS must be enabled BEFORE policies are created.
--
-- Design intent: the landing page is a STATIC site using the anon key. The
-- waitlist email list must NOT be readable by anon, so the table has RLS on
-- with NO anon policies. All writes go through SECURITY DEFINER RPCs that
-- validate input at the boundary and return only a position number.

-- ─────────────────────────────────────────────────────────────────────────
-- Schema
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique
                check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  city          text check (city is null or length(city) <= 120),  -- launch-metro signal
  games         text[] not null default array[]::text[],
  trade_how     text check (trade_how is null or length(trade_how) <= 80),
  want_reason   text check (want_reason is null or length(want_reason) <= 80),
  referral_code text not null unique,
  referred_by   text,                                              -- referral_code of referrer
  position      int not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Position reads like an established list (the design mocked ~#412).
-- We seed the displayed position so #1 signup shows as #412.
-- Stored position = seed + row ordinal.

-- Maintain updated_at on every row update (reuse global helper if present).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists waitlist_set_updated_at on public.waitlist;
create trigger waitlist_set_updated_at
  before update on public.waitlist
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Row-Level Security — table is locked; only the RPCs below touch it.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.waitlist enable row level security;

-- Intentionally NO policies for anon/authenticated. Direct select/insert is
-- denied; the SECURITY DEFINER functions below are the only access path.

-- ─────────────────────────────────────────────────────────────────────────
-- join_waitlist — idempotent signup, returns the (displayed) position.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.join_waitlist(
  p_email       text,
  p_city        text default null,
  p_referred_by text default null
)
returns table (pos int, ref_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_city  text := nullif(trim(coalesce(p_city, '')), '');
  v_ref   text := nullif(trim(coalesce(p_referred_by, '')), '');
  v_seed  constant int := 411;  -- so the first real signup displays as #412
  v_code  text;
  v_pos   int;
begin
  -- Validate at the boundary.
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'invalid email';
  end if;
  if v_city is not null and length(v_city) > 120 then
    v_city := left(v_city, 120);
  end if;

  -- Already on the list? Return existing position (idempotent).
  select w.position, w.referral_code
    into v_pos, v_code
    from public.waitlist w
   where w.email = v_email;

  if found then
    -- Backfill city if they provided one this time and we didn't have it.
    if v_city is not null then
      update public.waitlist set city = coalesce(city, v_city) where email = v_email;
    end if;
    pos := v_pos;
    ref_code := v_code;
    return next;
    return;
  end if;

  -- New signup: short unique referral code, position = seed + count.
  -- md5(random()) keeps this dependency-free (no pgcrypto needed).
  v_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  v_pos  := v_seed + (select count(*) from public.waitlist) + 1;

  insert into public.waitlist (email, city, referred_by, referral_code, position)
  values (v_email, v_city, v_ref, v_code, v_pos);

  pos := v_pos;
  ref_code := v_code;
  return next;
end;
$$;

grant execute on function public.join_waitlist(text, text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- submit_waitlist_survey — attach survey answers to an existing signup.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.submit_waitlist_survey(
  p_email       text,
  p_games       text[] default array[]::text[],
  p_trade_how   text   default null,
  p_want_reason text   default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_games text[];
begin
  -- Cap array size and element length defensively.
  v_games := (
    select coalesce(array_agg(left(g, 40)), array[]::text[])
    from unnest(coalesce(p_games, array[]::text[])) as g
    limit 20
  );

  update public.waitlist
     set games       = v_games,
         trade_how   = nullif(left(coalesce(p_trade_how, ''), 80), ''),
         want_reason = nullif(left(coalesce(p_want_reason, ''), 80), '')
   where email = v_email;
end;
$$;

grant execute on function public.submit_waitlist_survey(text, text[], text, text) to anon, authenticated;
