-- Milestone 8: trade requests + 1:1 messaging.
--
-- A `trade` is a thread between two users that starts as a request (pending) and
-- becomes a chat once accepted. `messages` are the chat lines within a trade.
-- RLS: only the two participants can see or write a trade and its messages.

-- ─────────────────────────────────────────────────────────────────────────
-- trades
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.trades (
  id                uuid primary key default gen_random_uuid(),
  requester_id      uuid not null default auth.uid()
                    references public.profiles(id) on delete cascade,
  recipient_id      uuid not null references public.profiles(id) on delete cascade,
  status            text not null default 'pending'
                    check (status in ('pending','accepted','declined','cancelled','completed')),
  requester_read_at timestamptz not null default now(),
  recipient_read_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (requester_id <> recipient_id)
);

create index if not exists trades_requester_idx on public.trades (requester_id);
create index if not exists trades_recipient_idx on public.trades (recipient_id);

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

alter table public.trades enable row level security;

drop policy if exists "trades: select participant" on public.trades;
drop policy if exists "trades: insert as requester" on public.trades;
drop policy if exists "trades: update participant"  on public.trades;

create policy "trades: select participant"
  on public.trades for select
  using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "trades: insert as requester"
  on public.trades for insert
  with check (requester_id = auth.uid());

create policy "trades: update participant"
  on public.trades for update
  using (requester_id = auth.uid() or recipient_id = auth.uid())
  with check (requester_id = auth.uid() or recipient_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- messages
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  trade_id    uuid not null references public.trades(id) on delete cascade,
  sender_id   uuid not null default auth.uid()
              references public.profiles(id) on delete cascade,
  body        text not null check (length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index if not exists messages_trade_idx on public.messages (trade_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages: select participant" on public.messages;
drop policy if exists "messages: insert as sender"   on public.messages;

create policy "messages: select participant"
  on public.messages for select
  using (exists (
    select 1 from public.trades t
    where t.id = messages.trade_id
      and (t.requester_id = auth.uid() or t.recipient_id = auth.uid())
  ));

create policy "messages: insert as sender"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.trades t
      where t.id = messages.trade_id
        and (t.requester_id = auth.uid() or t.recipient_id = auth.uid())
        and t.status in ('pending','accepted','completed')
    )
  );
