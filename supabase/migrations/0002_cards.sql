-- Milestone 3: cards table
-- Stores the full Gundam Card Game catalog scraped from gundam-gcg.com.
-- Cards are read by all authenticated users. Only the service-role key
-- (used by the seed script) can write — no client-side mutations.

-- ─────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pg_trgm;  -- for fast fuzzy/ilike search

-- ─────────────────────────────────────────────────────────────────────────
-- Schema
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.cards (
  id            text primary key,             -- full unique code, e.g. "GD01-001" or "GD01-001_p1"
  game          text not null default 'gundam'
                check (game in ('gundam')),

  -- Identity
  name          text not null,
  set_name      text,                          -- "Newtype Rising"
  set_code      text,                          -- "GD01" / "ST04" / "EB01"
  number        text,                          -- "001" — just the number within the set
  art_variant   text,                          -- null for base print; "p1", "p2", etc. for alt arts
  base_card_id  text,                          -- canonical print, e.g. "GD01-001" (for grouping alt arts)

  -- Categorization (for filtering and browsing)
  card_type     text                           -- Unit | Pilot | Command | Base | Resource
                check (card_type is null or card_type in ('Unit','Pilot','Command','Base','Resource')),
  color         text,                          -- Blue | White | Green | Red
  rarity        text,                          -- C | U | R | SR | LR | etc.

  -- Stats (nullable — some only apply to certain card types)
  cost          int,
  level         int,
  ap            int,                           -- attack power (Unit)
  hp            int,                           -- hit points (Unit)
  link          text,                          -- pilot link constraint
  zone          text,                          -- deployment zone
  trait         text[],                        -- keywords / traits

  -- Text
  effect        text,
  source_title  text,                          -- e.g. "Mobile Suit Gundam"

  -- Image
  image_url     text,                          -- Supabase Storage public URL

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────

-- Trigram index for fast ILIKE / similarity name search
create index if not exists cards_name_trgm_idx
  on public.cards using gin (name gin_trgm_ops);

create index if not exists cards_name_lower_idx    on public.cards (lower(name));
create index if not exists cards_game_idx          on public.cards (game);
create index if not exists cards_set_code_idx      on public.cards (set_code);
create index if not exists cards_color_idx         on public.cards (color);
create index if not exists cards_type_idx          on public.cards (card_type);
create index if not exists cards_base_card_id_idx  on public.cards (base_card_id);
create index if not exists cards_set_number_idx    on public.cards (set_code, number, art_variant);

-- updated_at trigger (function defined in 0001)
drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table public.cards enable row level security;

drop policy if exists "cards: read all" on public.cards;

-- Any authenticated user can read the entire catalog.
create policy "cards: read all"
  on public.cards for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies are granted.
-- The seed script uses the service_role key, which bypasses RLS.
-- Clients have ZERO ability to mutate this table.
