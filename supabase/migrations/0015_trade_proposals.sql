-- Milestone 8b: structured trade proposals (give/get cards + optional cash).
--
-- A trade thread can carry one or more proposals. Each proposal lists the cards
-- the proposer GIVES and GETS, plus optional cash, and shows up in the chat as a
-- message of kind 'proposal'. RLS scopes everything to the two trade participants.

create table if not exists public.trade_proposals (
  id          uuid primary key default gen_random_uuid(),
  trade_id    uuid not null references public.trades(id) on delete cascade,
  proposer_id uuid not null default auth.uid()
              references public.profiles(id) on delete cascade,
  status      text not null default 'pending'
              check (status in ('pending','accepted','declined','withdrawn')),
  cash_cents  int not null default 0 check (cash_cents >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists trade_proposals_trade_idx on public.trade_proposals (trade_id, created_at);

create table if not exists public.trade_proposal_items (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.trade_proposals(id) on delete cascade,
  side        text not null check (side in ('give','get')),
  card_id     text not null references public.cards(id) on delete restrict,
  quantity    int not null default 1 check (quantity between 1 and 99),
  condition   text not null default 'NM' check (condition in ('NM','LP','MP','HP','DMG')),
  is_foil     boolean not null default false
);
create index if not exists trade_proposal_items_proposal_idx on public.trade_proposal_items (proposal_id);

-- Link a chat message to a proposal so the thread renders proposal cards inline.
alter table public.messages
  add column if not exists kind text not null default 'text' check (kind in ('text','proposal'));
alter table public.messages
  add column if not exists proposal_id uuid references public.trade_proposals(id) on delete set null;

-- ── RLS ──
alter table public.trade_proposals enable row level security;
alter table public.trade_proposal_items enable row level security;

drop policy if exists "proposals: select participant" on public.trade_proposals;
drop policy if exists "proposals: insert proposer"    on public.trade_proposals;
drop policy if exists "proposals: update participant" on public.trade_proposals;

create policy "proposals: select participant" on public.trade_proposals for select
  using (exists (select 1 from public.trades t where t.id = trade_proposals.trade_id
    and (t.requester_id = auth.uid() or t.recipient_id = auth.uid())));

create policy "proposals: insert proposer" on public.trade_proposals for insert
  with check (proposer_id = auth.uid() and exists (
    select 1 from public.trades t where t.id = trade_proposals.trade_id
      and (t.requester_id = auth.uid() or t.recipient_id = auth.uid())));

create policy "proposals: update participant" on public.trade_proposals for update
  using (exists (select 1 from public.trades t where t.id = trade_proposals.trade_id
    and (t.requester_id = auth.uid() or t.recipient_id = auth.uid())))
  with check (exists (select 1 from public.trades t where t.id = trade_proposals.trade_id
    and (t.requester_id = auth.uid() or t.recipient_id = auth.uid())));

drop policy if exists "proposal_items: select participant" on public.trade_proposal_items;
drop policy if exists "proposal_items: insert proposer"    on public.trade_proposal_items;

create policy "proposal_items: select participant" on public.trade_proposal_items for select
  using (exists (select 1 from public.trade_proposals p
    join public.trades t on t.id = p.trade_id
    where p.id = trade_proposal_items.proposal_id
      and (t.requester_id = auth.uid() or t.recipient_id = auth.uid())));

create policy "proposal_items: insert proposer" on public.trade_proposal_items for insert
  with check (exists (select 1 from public.trade_proposals p
    where p.id = trade_proposal_items.proposal_id and p.proposer_id = auth.uid()));
