-- Milestone 9: TCGplayer price reference (sourced via tcgcsv.com, synced ~daily).
--
-- Pricing is a SOFT reference ("≈ market suggested"), not an in-app sale price.
-- Data is product-level (Near-Mint equivalent), split by Normal/Foil sub-type.
-- Per-condition (LP/MP/HP) prices are NOT available on the free feed.
--
-- Three pieces:
--   1. cards.tcgplayer_product_id  — the mapping (filled by map-tcgplayer-ids.ts)
--   2. card_prices                 — current snapshot (what the app reads)
--   3. card_price_history          — append-only, powers the "± weekly" trend
--
-- Re-running is safe (idempotent). Client reads only; the sync script writes
-- with the service-role key (bypasses RLS).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Mapping column on cards
-- ─────────────────────────────────────────────────────────────────────────
alter table public.cards
  add column if not exists tcgplayer_product_id integer;

create index if not exists cards_tcgplayer_product_id_idx
  on public.cards (tcgplayer_product_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Current prices — one row per (product, sub-type)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.card_prices (
  tcgplayer_product_id integer not null,
  sub_type     text    not null default 'Normal',   -- 'Normal' | 'Foil'
  market       numeric(10,2),                        -- TCGplayer Market Price (the headline ≈ value)
  low          numeric(10,2),
  mid          numeric(10,2),
  high         numeric(10,2),
  direct_low   numeric(10,2),
  updated_at   timestamptz not null default now(),
  primary key (tcgplayer_product_id, sub_type)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Price history — append-only daily/biweekly snapshots for the ± trend
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.card_price_history (
  tcgplayer_product_id integer not null,
  sub_type      text   not null default 'Normal',
  snapshot_date date   not null,
  market        numeric(10,2),
  low           numeric(10,2),
  high          numeric(10,2),
  primary key (tcgplayer_product_id, sub_type, snapshot_date)
);

create index if not exists card_price_history_date_idx
  on public.card_price_history (tcgplayer_product_id, sub_type, snapshot_date desc);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS — any authenticated user can read prices; nobody can write from a client.
-- (The sync script uses the service-role key, which bypasses RLS.)
-- ─────────────────────────────────────────────────────────────────────────
alter table public.card_prices enable row level security;
drop policy if exists "card_prices: read all" on public.card_prices;
create policy "card_prices: read all"
  on public.card_prices for select to authenticated using (true);

alter table public.card_price_history enable row level security;
drop policy if exists "card_price_history: read all" on public.card_price_history;
create policy "card_price_history: read all"
  on public.card_price_history for select to authenticated using (true);
