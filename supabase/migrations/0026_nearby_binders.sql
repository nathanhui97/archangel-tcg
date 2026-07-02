-- Social Phase 3b: browse public binders from nearby traders (the "Nearby
-- Binders" segment on the Social tab). Mirrors get_nearby_cards: SECURITY
-- DEFINER so earthdistance runs, but only exposes public binders, never the
-- caller's own, and never raw coordinates. Idempotent.

drop function if exists public.get_nearby_binders(numeric, numeric, numeric);

create or replace function public.get_nearby_binders(
  p_lat       numeric default null,
  p_lng       numeric default null,
  p_radius_km numeric default 25
)
returns table (
  binder_id             uuid,
  name                  text,
  cover_image_url       text,
  item_count            int,
  owner_id              uuid,
  owner_handle          text,
  owner_verified_at     timestamptz,
  owner_willing_to_ship boolean,
  binder_verified_at    timestamptz,
  distance_km           numeric,
  total_value           numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    b.id,
    b.name,
    coalesce(
      (select c.image_url from public.cards c where c.id = b.cover_card_id),
      (select c2.image_url
         from public.binder_items bi2
         join public.cards c2 on c2.id = bi2.card_id
        where bi2.binder_id = b.id
        order by bi2.id
        limit 1)
    ),
    (select count(*)::int from public.binder_items bi where bi.binder_id = b.id),
    p.id,
    p.handle,
    p.verified_at,
    p.willing_to_ship,
    b.verified_at,
    case
      when p.lat is not null and p.lng is not null and p_lat is not null and p_lng is not null
      then round(
        (earth_distance(
          ll_to_earth(p.lat::float8, p.lng::float8),
          ll_to_earth(p_lat::float8, p_lng::float8)
        ) / 1000)::numeric, 1)
      else null
    end,
    -- Estimated combined value: Σ(best market price × qty). Normal price preferred.
    (select coalesce(sum(coalesce(cp.market, 0) * bi.quantity), 0)
       from public.binder_items bi
       join public.cards c on c.id = bi.card_id
       left join lateral (
         select cp2.market
           from public.card_prices cp2
          where cp2.tcgplayer_product_id = c.tcgplayer_product_id
          order by (cp2.sub_type = 'Normal') desc, cp2.market desc nulls last
          limit 1
       ) cp on true
      where bi.binder_id = b.id)
  from public.binders b
  join public.profiles p on p.id = b.user_id
  where
    b.is_public = true
    and b.user_id <> auth.uid()
    and exists (select 1 from public.binder_items bi where bi.binder_id = b.id)
    and (
      p.willing_to_ship = true
      or (
        p_lat is not null and p_lng is not null and p.lat is not null and p.lng is not null
        and earth_distance(
              ll_to_earth(p.lat::float8, p.lng::float8),
              ll_to_earth(p_lat::float8, p_lng::float8)
            ) / 1000 <= p_radius_km
      )
    )
  order by
    case
      when p.lat is not null and p.lng is not null and p_lat is not null and p_lng is not null
      then earth_distance(
        ll_to_earth(p.lat::float8, p.lng::float8),
        ll_to_earth(p_lat::float8, p_lng::float8)
      ) / 1000
      else null
    end asc nulls last,
    b.verified_at desc nulls last,
    b.created_at desc;
end;
$$;

grant execute on function public.get_nearby_binders(numeric, numeric, numeric) to authenticated;
