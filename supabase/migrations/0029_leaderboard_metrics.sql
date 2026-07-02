-- Leaderboard: add the 'count' metric (Most Cards) and a city list for the
-- picker. Both verification-gated + SECURITY DEFINER. Idempotent.

drop function if exists public.get_city_leaderboard(text, text, int);

create or replace function public.get_city_leaderboard(
  p_city text, p_metric text default 'value', p_limit int default 200
)
returns table (rank bigint, user_id uuid, handle text, verified_at timestamptz, score numeric)
language sql security definer set search_path = public
as $$
  with item_val as (
    select b.user_id, bi.quantity, c.is_alt_art,
      (select cp.market from public.card_prices cp
        where cp.tcgplayer_product_id = c.tcgplayer_product_id
        order by (cp.sub_type = 'Normal') desc, cp.market desc nulls last limit 1) as market
    from public.binders b
    join public.binder_items bi on bi.binder_id = b.id
    join public.cards c on c.id = bi.card_id
    join public.profiles p on p.id = b.user_id
    where b.is_public = true and b.verified_at is not null
      and p.city is not null and lower(p.city) = lower(p_city)
  ),
  agg as (
    select user_id,
      sum(coalesce(market, 0) * quantity)                as total_value,
      sum(case when is_alt_art then quantity else 0 end) as alt_count,
      sum(quantity)                                      as card_count
    from item_val group by user_id
  ),
  scored as (
    select a.user_id, pr.handle, pr.verified_at,
      (case when p_metric = 'alt' then a.alt_count
            when p_metric = 'count' then a.card_count
            else a.total_value end)::numeric as score
    from agg a join public.profiles pr on pr.id = a.user_id
  )
  select row_number() over (order by s.score desc, s.handle asc) as rank,
    s.user_id, s.handle, s.verified_at, s.score
  from scored s where s.score > 0 order by rank limit p_limit;
$$;

grant execute on function public.get_city_leaderboard(text, text, int) to authenticated;

-- Cities that actually have a leaderboard (for the picker).
drop function if exists public.get_leaderboard_cities();

create or replace function public.get_leaderboard_cities()
returns table (city text, collectors int)
language sql security definer set search_path = public
as $$
  select p.city, count(distinct b.user_id)::int
  from public.binders b
  join public.profiles p on p.id = b.user_id
  where b.is_public = true and b.verified_at is not null and p.city is not null
  group by p.city
  order by count(distinct b.user_id) desc, p.city asc;
$$;

grant execute on function public.get_leaderboard_cities() to authenticated;
