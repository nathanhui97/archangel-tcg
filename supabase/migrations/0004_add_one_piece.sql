-- Milestone 3.5: Add One Piece Card Game support to the cards table
--
-- One Piece introduces a few fields Gundam doesn't have:
--   - power     (attack value, 1000-10000 scale vs Gundam's 1-10 AP)
--   - counter   (defensive value used when defending)
--   - life      (Leader card's life total)
--   - attribute (fight attribute: Special/Strike/Slash/Ranged/Wisdom)
--   - block     (rotation block icon, 1-5 or X)
--
-- Also expands the `game` and `card_type` CHECK constraints.

-- ─────────────────────────────────────────────────────────────────────────
-- Expand game CHECK to allow 'one_piece'
-- ─────────────────────────────────────────────────────────────────────────

alter table public.cards
  drop constraint if exists cards_game_check;

alter table public.cards
  add constraint cards_game_check
  check (game in ('gundam', 'one_piece'));

-- ─────────────────────────────────────────────────────────────────────────
-- Expand card_type CHECK to allow One Piece categories
-- ─────────────────────────────────────────────────────────────────────────

alter table public.cards
  drop constraint if exists cards_card_type_check;

alter table public.cards
  add constraint cards_card_type_check
  check (card_type is null or card_type in (
    -- Gundam
    'Unit', 'Pilot', 'Command', 'Base', 'Resource',
    -- One Piece
    'Leader', 'Character', 'Event', 'Stage', 'DON!!'
  ));

-- ─────────────────────────────────────────────────────────────────────────
-- One Piece-specific columns (nullable for Gundam cards)
-- ─────────────────────────────────────────────────────────────────────────

alter table public.cards
  add column if not exists power     int,
  add column if not exists counter   int,
  add column if not exists life      int,
  add column if not exists attribute text,
  add column if not exists block     text;

-- Indexes for the new searchable fields
create index if not exists cards_power_idx     on public.cards (power);
create index if not exists cards_attribute_idx on public.cards (attribute);
create index if not exists cards_block_idx     on public.cards (block);
