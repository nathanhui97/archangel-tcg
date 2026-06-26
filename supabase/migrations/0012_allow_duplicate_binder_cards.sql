-- Allow duplicate cards in a binder.
--
-- Migration 0005 enforced one row per (binder_id, card_id, condition, is_foil)
-- via the `binder_items_unique_print_in_binder` unique index, and the app bumped
-- quantity instead of inserting a second row. Users now want the same card to
-- appear as multiple separate entries (e.g. laying out copies across binder
-- slots, or just listing duplicates), so drop the constraint.
--
-- The plain lookup index on (binder_id) from 0005 still covers per-binder reads.

drop index if exists public.binder_items_unique_print_in_binder;
