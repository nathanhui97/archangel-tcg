-- Milestone 9 polish: make card pickers lead with the "chase" cards.
--
-- Two derived columns let every display surface sort alt-arts first and order
-- by rarity (the raw `rarity` column is text like "SR", which does NOT sort
-- correctly), and let the picker filter to alt-arts only.
--
-- Both are STORED generated columns: Postgres maintains them automatically on
-- insert/update, so the seed script needs no changes and existing rows are
-- backfilled when this migration runs. Safe to re-run (idempotent).

-- ─────────────────────────────────────────────────────────────────────────
-- is_alt_art — true for any non-base print ("p1", "p2", …)
-- ─────────────────────────────────────────────────────────────────────────
alter table public.cards
  add column if not exists is_alt_art boolean
    generated always as (art_variant is not null) stored;

-- ─────────────────────────────────────────────────────────────────────────
-- rarity_rank — higher = rarer. Unknown/null rarities sort last (rank 1).
-- Gundam tiers: C < U < R < SR < LR. Extend the CASE as new tiers appear.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.cards
  add column if not exists rarity_rank smallint
    generated always as (
      case upper(coalesce(rarity, ''))
        when 'LR' then 6
        when 'SR' then 5
        when 'R'  then 4
        when 'U'  then 3
        when 'C'  then 2
        else 1
      end
    ) stored;

-- ─────────────────────────────────────────────────────────────────────────
-- Index matching the canonical display order:
--   alt-arts first, then highest rarity, then newest set, then number.
-- ─────────────────────────────────────────────────────────────────────────
create index if not exists cards_display_order_idx
  on public.cards (is_alt_art desc, rarity_rank desc, set_code desc, number);
