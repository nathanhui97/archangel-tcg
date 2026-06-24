-- Adds binder_type to binders + updates RPCs to filter to trade binders.
--
-- binder_type values:
--   'collection' (default) — personal collection, public or private
--   'trade'                — cards actively offered for trade/sale
--
-- get_nearby_cards is updated to only surface 'trade' binders.
-- get_nearby_wantlists is new — powers the Wanted tab.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. binder_type column
-- ─────────────────────────────────────────────────────────────────────────

alter table public.binders
  add column if not exists binder_type text not null default 'collection'
    check (binder_type in ('collection', 'trade'));

create index if not exists binders_type_idx on public.binders (binder_type);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. get_nearby_cards — now restricted to trade binders only
-- ─────────────────────────────────────────────────────────────────────────

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
        ) / 1000)::numeric, 1
      )
      else null
    end
  from public.binder_items bi
  join public.binders      bn on bn.id = bi.binder_id
  join public.profiles     p  on p.id  = bn.user_id
  join public.cards        c  on c.id  = bi.card_id
  where
    bn.is_public = true
    and bn.binder_type = 'trade'
    and bn.user_id <> auth.uid()
    and (p_game is null or c.game = p_game)
    and (
      p.willing_to_ship = true
      or (
        p_lat is not null and p_lng is not null
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

-- ─────────────────────────────────────────────────────────────────────────
-- 3. get_nearby_wantlists — powers the Wanted tab
-- ─────────────────────────────────────────────────────────────────────────
-- Returns wantlist items from nearby users (or willing-to-ship users).
-- Excludes the caller's own wantlist. UI groups rows by card to show
-- "X people near you want this card."

drop function if exists public.get_nearby_wantlists(numeric, numeric, numeric, text);

create or replace function public.get_nearby_wantlists(
  p_lat        numeric  default null,
  p_lng        numeric  default null,
  p_radius_km  numeric  default 25,
  p_game       text     default null
)
returns table (
  card_id        text,
  card_name      text,
  card_image_url text,
  card_game      text,
  card_set_code  text,
  card_number    text,
  wanter_id      uuid,
  wanter_handle  text,
  distance_km    numeric
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
    p.id,
    p.handle,
    case
      when p.lat is not null and p.lng is not null
        and p_lat is not null and p_lng is not null
      then round(
        (earth_distance(
          ll_to_earth(p.lat::float8, p.lng::float8),
          ll_to_earth(p_lat::float8, p_lng::float8)
        ) / 1000)::numeric, 1
      )
      else null
    end
  from public.wantlist_items wi
  join public.profiles p on p.id = wi.user_id
  join public.cards    c on c.id = wi.card_id
  where
    wi.user_id <> auth.uid()
    and (p_game is null or c.game = p_game)
    and (
      p.willing_to_ship = true
      or (
        p_lat is not null and p_lng is not null
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

grant execute on function public.get_nearby_wantlists(numeric, numeric, numeric, text)
  to authenticated;
