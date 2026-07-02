-- Social Phase 3: make pull photos internal-only, and add the feed view.
-- Idempotent — safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Pull photos are for verification ONLY — never shown publicly.
--    Flip the bucket to private and drop public read; the reviewer uses the
--    service-role key (bypasses RLS), and an owner can read their own folder.
-- ─────────────────────────────────────────────────────────────────────────
update storage.buckets set public = false where id = 'pull-photos';

drop policy if exists "pull-photos: public read" on storage.objects;
drop policy if exists "pull-photos: owner read" on storage.objects;
create policy "pull-photos: owner read"
  on storage.objects for select to authenticated
  using (bucket_id = 'pull-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. pull_feed — public + own pulls, newest first, with reaction counts and a
--    soft market price. security_invoker so the pulls RLS (public or own)
--    applies; joins public_profiles so other users' handle/✓ are visible.
-- ─────────────────────────────────────────────────────────────────────────
drop view if exists public.pull_feed;
create view public.pull_feed
  with (security_invoker = true) as
  select
    p.id, p.user_id, p.card_id, p.caption, p.is_pull, p.visibility,
    p.verified_at, p.created_at,
    pr.handle      as owner_handle,
    pr.verified_at as owner_verified_at,
    c.name         as card_name,
    c.image_url    as card_image_url,
    c.rarity       as card_rarity,
    c.is_alt_art   as card_is_alt_art,
    price.market   as card_market,
    coalesce(rc.fire, 0)  as fire_count,
    coalesce(rc.heart, 0) as heart_count,
    coalesce(rc.want, 0)  as want_count
  from public.pulls p
  join public.public_profiles pr on pr.id = p.user_id
  join public.cards           c  on c.id  = p.card_id
  left join lateral (
    select cp.market
    from public.card_prices cp
    where cp.tcgplayer_product_id = c.tcgplayer_product_id
    order by (cp.sub_type = 'Normal') desc, cp.market desc nulls last
    limit 1
  ) price on true
  left join (
    select pull_id,
      count(*) filter (where kind = 'fire')  as fire,
      count(*) filter (where kind = 'heart') as heart,
      count(*) filter (where kind = 'want')  as want
    from public.pull_reactions
    group by pull_id
  ) rc on rc.pull_id = p.id;

grant select on public.pull_feed to authenticated;
