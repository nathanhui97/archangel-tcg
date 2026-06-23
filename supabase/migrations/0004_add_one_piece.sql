-- Milestone 3.5: Add One Piece Card Game support to the cards table.
--
-- One Piece introduces fields Gundam doesn't have:
--   - power     (attack value, 1000-10000 scale vs Gundam's 1-10 AP)
--   - counter   (defensive value used when defending)
--   - life      (Leader card's life total)
--   - attribute (fight attribute: Special/Strike/Slash/Ranged/Wisdom)
--   - block     (rotation block icon, 1-5 or X)
--
-- Each statement is on its own line — Supabase's SQL editor doesn't
-- always handle multi-action ALTER TABLEs.

-- Drop old check constraints (no-op if they don't exist)
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_game_check;
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_card_type_check;

-- New check constraints
ALTER TABLE public.cards ADD CONSTRAINT cards_game_check
  CHECK (game IN ('gundam', 'one_piece'));

ALTER TABLE public.cards ADD CONSTRAINT cards_card_type_check
  CHECK (card_type IS NULL OR card_type IN (
    'Unit','Pilot','Command','Base','Resource',
    'Leader','Character','Event','Stage','DON!!'
  ));

-- One Piece-specific nullable columns
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS power     INT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS counter   INT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS life      INT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS attribute TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS block     TEXT;

-- Indexes for the new searchable fields
CREATE INDEX IF NOT EXISTS cards_power_idx     ON public.cards (power);
CREATE INDEX IF NOT EXISTS cards_attribute_idx ON public.cards (attribute);
CREATE INDEX IF NOT EXISTS cards_block_idx     ON public.cards (block);
