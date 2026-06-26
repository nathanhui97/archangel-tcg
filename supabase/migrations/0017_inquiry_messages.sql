-- Card requests as chat messages: an 'inquiry' message references a specific
-- card so it renders as a card in the conversation (not a fixed banner). This
-- lets one thread hold requests about different cards over time.

alter table public.messages
  add column if not exists card_id text references public.cards(id) on delete set null;

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check check (kind in ('text','proposal','inquiry'));
