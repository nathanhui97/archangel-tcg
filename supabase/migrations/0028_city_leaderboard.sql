-- Social: city leaderboard. Ranks collectors by their VERIFIED public binders,
-- scoped to a city — the "Top in Toronto" flex.
--
-- Verification-gated on purpose: only binders with verified_at count, so the
-- board can't be gamed with fake value AND climbing it is the incentive to get
-- verified (ties pricing → value → leaderboard → verification → trust).
--
-- p_metric: 'value' (Σ market × qty) | 'alt' (Σ qty of alt-art cards).
-- SECURITY DEFINER so it can aggregate across users; only public data is
-- returned (handle, verified flag, aggregate score). Idempotent.

drop function if exists public.get_city_leaderboard(text, text, int);

create or replace function public.get_city_leaderboard(
  p_city   text,
  p_metric text default 'value',
  p_limit  int  default 200
)
returns table (
  rank        bigint,
  user_id     uuid,
  handle      text,
  verified_at timestamptz,
  score       numeric
)
language sql
security definer
set search_path = public
as $$
  with item_val as (
    select
      b.user_id,
      bi.quantity,
      c.is_alt_art,
      (select cp.market
         from public.card_prices cp
        where cp.tcgplayer_product_id = c.tcgplayer_product_id
        order by (cp.sub_type = 'Normal') desc, cp.market desc nulls last
        limit 1) as market
    from public.binders b
    join public.binder_items bi on bi.binder_id = b.id
    join public.cards        c  on c.id = bi.card_id
    join public.profiles     p  on p.id = b.user_id
    where b.is_public = true
      and b.verified_at is not null
      and p.city is not null
      and lower(p.city) = lower(p_city)
  ),
  agg as (
    select
      user_id,
      sum(coalesce(market, 0) * quantity)                 as total_value,
      sum(case when is_alt_art then quantity else 0 end)  as alt_count
    from item_val
    group by user_id
  ),
  scored as (
    select
      a.user_id,
      pr.handle,
      pr.verified_at,
      (case when p_metric = 'alt' then a.alt_count else a.total_value end)::numeric as score
    from agg a
    join public.profiles pr on pr.id = a.user_id
  )
  select
    row_number() over (order by s.score desc, s.handle asc) as rank,
    s.user_id,
    s.handle,
    s.verified_at,
    s.score
  from scored s
  where s.score > 0
  order by rank
  limit p_limit;
$$;

grant execute on function public.get_city_leaderboard(text, text, int) to authenticated;
