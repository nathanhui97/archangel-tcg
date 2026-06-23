-- Milestone 4: binders + binder_items.
--
-- Users can create as many named binders as they want, each toggled public
-- or private. Each binder holds card entries with quantity, condition,
-- foil flag, and optional photo/notes.
--
-- RLS philosophy:
--   - A user can do anything to their own binders/items.
--   - Any authenticated user can READ public binders + their items.
--   - Private binders + their items are invisible to others (no leaks).

-- ─────────────────────────────────────────────────────────────────────────
-- binders
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.binders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references public.profiles(id) on delete cascade,
  name        text not null check (length(name) between 1 and 60),
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists binders_user_id_idx     on public.binders (user_id);
create index if not exists binders_is_public_idx   on public.binders (is_public) where is_public = true;

drop trigger if exists binders_set_updated_at on public.binders;
create trigger binders_set_updated_at
  before update on public.binders
  for each row execute function public.set_updated_at();

alter table public.binders enable row level security;

drop policy if exists "binders: select own"    on public.binders;
drop policy if exists "binders: select public" on public.binders;
drop policy if exists "binders: insert own"    on public.binders;
drop policy if exists "binders: update own"    on public.binders;
drop policy if exists "binders: delete own"    on public.binders;

create policy "binders: select own"
  on public.binders for select
  using (user_id = auth.uid());

create policy "binders: select public"
  on public.binders for select
  to authenticated
  using (is_public = true);

create policy "binders: insert own"
  on public.binders for insert
  with check (user_id = auth.uid());

create policy "binders: update own"
  on public.binders for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "binders: delete own"
  on public.binders for delete
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- binder_items
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.binder_items (
  id          uuid primary key default gen_random_uuid(),
  binder_id   uuid not null references public.binders(id) on delete cascade,
  card_id     text not null references public.cards(id) on delete restrict,
  quantity    int not null default 1 check (quantity between 1 and 999),
  condition   text not null default 'NM'
              check (condition in ('NM','LP','MP','HP','DMG')),
  is_foil     boolean not null default false,
  photo_url   text,
  notes       text check (notes is null or length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists binder_items_binder_id_idx on public.binder_items (binder_id);
create index if not exists binder_items_card_id_idx   on public.binder_items (card_id);

-- A user shouldn't have two rows for the same card+condition+foil combination
-- in the same binder — they should just bump the quantity instead.
create unique index if not exists binder_items_unique_print_in_binder
  on public.binder_items (binder_id, card_id, condition, is_foil);

drop trigger if exists binder_items_set_updated_at on public.binder_items;
create trigger binder_items_set_updated_at
  before update on public.binder_items
  for each row execute function public.set_updated_at();

alter table public.binder_items enable row level security;

drop policy if exists "binder_items: select own"     on public.binder_items;
drop policy if exists "binder_items: select public"  on public.binder_items;
drop policy if exists "binder_items: insert own"     on public.binder_items;
drop policy if exists "binder_items: update own"     on public.binder_items;
drop policy if exists "binder_items: delete own"     on public.binder_items;

-- Read your own items
create policy "binder_items: select own"
  on public.binder_items for select
  using (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.user_id = auth.uid()
  ));

-- Read items inside public binders
create policy "binder_items: select public"
  on public.binder_items for select
  to authenticated
  using (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.is_public = true
  ));

-- Modify only items inside YOUR OWN binders
create policy "binder_items: insert own"
  on public.binder_items for insert
  with check (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.user_id = auth.uid()
  ));

create policy "binder_items: update own"
  on public.binder_items for update
  using (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.user_id = auth.uid()
  ));

create policy "binder_items: delete own"
  on public.binder_items for delete
  using (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.user_id = auth.uid()
  ));
