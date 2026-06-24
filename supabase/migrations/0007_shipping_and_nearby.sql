-- Milestone 6 foundation: radius browsing + shipping flag.
--
-- Three things in one migration (they're tightly coupled):
--   1. Enable earthdistance (needs cube first) for server-side km math.
--   2. Add willing_to_ship to profiles + surface it on public_profiles view.
--   3. get_nearby_cards RPC — the single query the UI calls with any radius.
--
-- Apply in Supabase SQL Editor. Idempotent — safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Extensions
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists cube;
create extension if not exists earthdistance;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. willing_to_ship on profiles
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists willing_to_ship boolean not null default false;

-- Rebuild public_profiles view to expose the new field.
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, handle, games, lat, lng, willing_to_ship, created_at
  from public.profiles;

grant select on public.public_profiles to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. get_nearby_cards RPC
-- ─────────────────────────────────────────────────────────────────────────
--
-- Returns all public binder cards that are either:
--   a) owned by a user within p_radius_km of (p_lat, p_lng), OR
--   b) owned by a user with willing_to_ship = true (no distance limit).
--
-- p_lat / p_lng  — caller's location (rounded to 2 decimals). Pass NULL to
--                  see only shippers (e.g. user hasn't set location yet).
-- p_radius_km    — search radius, default 25. Ignored for shippers.
-- p_game         — 'gundam' | 'one_piece' | NULL (all games).
--
-- distance_km is NULL for shippers outside the radius (no coords comparison
-- needed). The UI can render these as "Ships anywhere".
--
-- Security: SECURITY DEFINER so earthdistance can run, but the WHERE clause
-- enforces: public binders only, never the caller's own cards.

drop function if exists public.get_nearby_cards(numeric, numeric, numeric, text);

create or replace function public.get_nearby_cards(
  p_lat        numeric  default null,
  p_lng        numeric  default null,
  p_radius_km  numeric  default 25,
  p_game       text     default null
)
returns table (
  card_id               text,
  card_name             text,
  card_image_url        text,
  card_game             text,
  card_set_code         text,
  card_number           text,
  binder_item_id        uuid,
  quantity              int,
  condition             text,
  is_foil               boolean,
  owner_id              uuid,
  owner_handle          text,
  owner_willing_to_ship boolean,
  distance_km           numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    c.id,
    c.name,
    c.image_url,
    c.game,
    c.set_code,
    c.number,
    bi.id,
    bi.quantity,
    bi.condition,
    bi.is_foil,
    p.id,
    p.handle,
    p.willing_to_ship,
    case
      when p.lat is not null and p.lng is not null
        and p_lat is not null and p_lng is not null
      then round(
        (earth_distance(
          ll_to_earth(p.lat::float8, p.lng::float8),
          ll_to_earth(p_lat::float8, p_lng::float8)
        ) / 1000)::numeric,
        1
      )
      else null
    end
  from public.binder_items bi
  join public.binders      bn on bn.id = bi.binder_id
  join public.profiles     p  on p.id  = bn.user_id
  join public.cards        c  on c.id  = bi.card_id
  where
    bn.is_public = true
    and bn.user_id <> auth.uid()
    and (p_game is null or c.game = p_game)
    and (
      p.willing_to_ship = true
      or (
        p_lat  is not null and p_lng  is not null
        and p.lat is not null and p.lng is not null
        and earth_distance(
              ll_to_earth(p.lat::float8, p.lng::float8),
              ll_to_earth(p_lat::float8, p_lng::float8)
            ) / 1000 <= p_radius_km
      )
    )
  order by
    case
      when p.lat is not null and p.lng is not null
        and p_lat is not null and p_lng is not null
      then earth_distance(
        ll_to_earth(p.lat::float8, p.lng::float8),
        ll_to_earth(p_lat::float8, p_lng::float8)
      ) / 1000
      else null
    end asc nulls last,
    c.name asc;
end;
$$;

grant execute on function public.get_nearby_cards(numeric, numeric, numeric, text)
  to authenticated;
