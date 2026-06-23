-- Milestone 2: profiles table + Row-Level Security
--
-- Apply this in the Supabase SQL Editor (or via `supabase db push` later).
-- Run order matters — RLS must be enabled BEFORE policies are created.

-- ─────────────────────────────────────────────────────────────────────────
-- Schema
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  handle      text not null unique
              check (handle ~ '^[a-zA-Z0-9_]{3,20}$'),  -- 3-20 chars, alnum + underscore
  games       text[] not null default array[]::text[],
  lat         numeric(5, 2),                            -- rounded to 2 decimals (~1.1 km grid)
  lng         numeric(5, 2),                            -- rounded to 2 decimals
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Lowercase handle uniqueness (prevents "Bob" and "bob" colliding).
create unique index if not exists profiles_handle_lower_idx
  on public.profiles (lower(handle));

-- Maintain updated_at on every row update.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Drop any prior policies so this migration is idempotent.
drop policy if exists "profiles: select own"        on public.profiles;
drop policy if exists "profiles: select public"     on public.profiles;
drop policy if exists "profiles: insert own"        on public.profiles;
drop policy if exists "profiles: update own"        on public.profiles;
drop policy if exists "profiles: delete own"        on public.profiles;

-- A user can read their own full profile.
create policy "profiles: select own"
  on public.profiles for select
  using (id = auth.uid());

-- Any authenticated user can read public profile fields of others.
-- We expose handle + games + (coarse) location, never internals.
-- Column-level restriction is enforced by the `public_profiles` view below.
create policy "profiles: select public"
  on public.profiles for select
  to authenticated
  using (id <> auth.uid());

-- A user can insert ONLY their own profile row (id must equal their auth.uid).
create policy "profiles: insert own"
  on public.profiles for insert
  with check (id = auth.uid());

-- A user can update ONLY their own profile.
create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- A user can delete only their own profile (cascades from auth.users delete too).
create policy "profiles: delete own"
  on public.profiles for delete
  using (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- Public view (what other users are allowed to see)
-- ─────────────────────────────────────────────────────────────────────────
-- This view exposes ONLY the safe fields. Clients should query this view
-- (not the table) when looking up other users.

create or replace view public.public_profiles as
  select id, handle, games, lat, lng, created_at
  from public.profiles;

grant select on public.public_profiles to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Handle availability check (callable from the client)
-- ─────────────────────────────────────────────────────────────────────────
-- Lets the signup screen check uniqueness before submitting. Returns true if
-- the handle is FREE. Case-insensitive.

create or replace function public.is_handle_available(p_handle text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(handle) = lower(p_handle)
  );
$$;

grant execute on function public.is_handle_available(text) to authenticated;
