-- Milestone 5: wantlist_items.
--
-- Players list the cards they're hunting. This is the other half of the
-- matching engine: their wantlist ↔ other users' public binders.
--
-- RLS philosophy:
--   - Wantlists are intentionally readable by all authenticated users.
--     Matching needs to see "who wants what nearby", and players want
--     others to know what they want so trades can happen.
--   - INSERT/UPDATE/DELETE — own rows only.

create table if not exists public.wantlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references public.profiles(id) on delete cascade,
  card_id     text not null references public.cards(id) on delete restrict,
  notes       text check (notes is null or length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A user can't want the same card twice. (Foil/condition don't apply —
-- if you want the card, you'll happily trade for any version.)
create unique index if not exists wantlist_items_unique_user_card
  on public.wantlist_items (user_id, card_id);

create index if not exists wantlist_items_user_id_idx on public.wantlist_items (user_id);
create index if not exists wantlist_items_card_id_idx on public.wantlist_items (card_id);

drop trigger if exists wantlist_items_set_updated_at on public.wantlist_items;
create trigger wantlist_items_set_updated_at
  before update on public.wantlist_items
  for each row execute function public.set_updated_at();

alter table public.wantlist_items enable row level security;

drop policy if exists "wantlist_items: select all"    on public.wantlist_items;
drop policy if exists "wantlist_items: insert own"    on public.wantlist_items;
drop policy if exists "wantlist_items: update own"    on public.wantlist_items;
drop policy if exists "wantlist_items: delete own"    on public.wantlist_items;

-- Wantlists are public-by-design (matching engine + browseable by other players)
create policy "wantlist_items: select all"
  on public.wantlist_items for select
  to authenticated
  using (true);

create policy "wantlist_items: insert own"
  on public.wantlist_items for insert
  with check (user_id = auth.uid());

create policy "wantlist_items: update own"
  on public.wantlist_items for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "wantlist_items: delete own"
  on public.wantlist_items for delete
  using (user_id = auth.uid());
