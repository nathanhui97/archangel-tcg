-- Pre-launch: extra waitlist survey fields (local shop, trade frequency, role)
--
-- Apply in the Supabase SQL Editor AFTER 0009_waitlist.sql.
-- Idempotent: safe to run whether or not 0009 has been applied yet.
--
-- Why these fields (liquidity-first signals):
--   lgs        — the local game store / play space; anchors launch to specific
--                shops and reveals clusters within a metro.
--   trade_freq — separates power-traders (who create liquidity) from casuals.
--   roles      — surfaces seed nodes (store owners / organizers are worth many
--                regular users when bootstrapping an area).

alter table public.waitlist
  add column if not exists lgs        text   check (lgs is null or length(lgs) <= 120),
  add column if not exists trade_freq text   check (trade_freq is null or length(trade_freq) <= 40),
  add column if not exists roles      text[] not null default array[]::text[];

-- Replace the survey RPC with the expanded signature. Drop the old overload
-- first so PostgREST doesn't see two ambiguous candidates.
drop function if exists public.submit_waitlist_survey(text, text[], text, text);

create or replace function public.submit_waitlist_survey(
  p_email       text,
  p_games       text[] default array[]::text[],
  p_trade_how   text   default null,
  p_want_reason text   default null,
  p_lgs         text   default null,
  p_trade_freq  text   default null,
  p_roles       text[] default array[]::text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_games text[];
  v_roles text[];
begin
  -- Cap array sizes and element lengths defensively.
  v_games := (
    select coalesce(array_agg(left(g, 40)), array[]::text[])
    from (select unnest(coalesce(p_games, array[]::text[])) as g limit 20) s
  );
  v_roles := (
    select coalesce(array_agg(left(r, 40)), array[]::text[])
    from (select unnest(coalesce(p_roles, array[]::text[])) as r limit 10) s
  );

  update public.waitlist
     set games       = v_games,
         trade_how   = nullif(left(coalesce(p_trade_how, ''), 80), ''),
         want_reason = nullif(left(coalesce(p_want_reason, ''), 80), ''),
         lgs         = nullif(left(coalesce(p_lgs, ''), 120), ''),
         trade_freq  = nullif(left(coalesce(p_trade_freq, ''), 40), ''),
         roles       = v_roles
   where email = v_email;
end;
$$;

grant execute on function public.submit_waitlist_survey(text, text[], text, text, text, text, text[]) to anon, authenticated;
