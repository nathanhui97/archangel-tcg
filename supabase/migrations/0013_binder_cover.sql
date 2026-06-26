-- Binder cover: let users pick a card whose art represents the binder.
--
-- Stores the chosen card id. If that card later leaves the catalog the cover
-- simply clears (set null) and the UI falls back to the binder's first card.

alter table public.binders
  add column if not exists cover_card_id text
  references public.cards(id) on delete set null;
