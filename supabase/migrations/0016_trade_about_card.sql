-- Card-context inquiries: a trade thread can be "about" a specific card, so the
-- chat shows which card the request started from.

alter table public.trades
  add column if not exists about_card_id text references public.cards(id) on delete set null;
