-- Social feature, Phase 1: the Pull Feed data foundation.
--
-- A `pull` is a social post about a card someone added to Bindar. An optional
-- photo (in the public `pull-photos` bucket) both flexes the card AND serves as
-- proof — a reviewer sets `verified_at` to grant the ✓. Reactions (incl. "want")
-- drive engagement and surface trade demand.
--
-- Trust badge lives on `binders.verified_at` / `profiles.verified_at` (public).
-- Idempotent — safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Verification columns (the ✓ badge; set by the founder review script only)
-- ─────────────────────────────────────────────────────────────────────────
alter table public.binders  add column if not exists verified_at timestamptz;
alter table public.profiles add column if not exists verified_at timestamptz;

-- Expose the trader badge publicly (rebuild the view with the new column).
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, handle, games, lat, lng, willing_to_ship, verified_at, created_at
  from public.profiles;
grant select on public.public_profiles to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. pulls — the feed spine (one row per shared card)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.pulls (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid()
                 references public.profiles(id) on delete cascade,
  card_id        text not null references public.cards(id),
  binder_item_id uuid references public.binder_items(id) on delete set null,
  photo_path     text,                              -- path in 'pull-photos'; null = no photo
  caption        text,
  is_pull        boolean not null default false,    -- "I pulled this" vs just sharing a card
  visibility     text not null default 'public'
                 check (visibility in ('public', 'private')),
  verified_at    timestamptz,                       -- set by reviewer (service role) only
  created_at     timestamptz not null default now()
);

create index if not exists pulls_created_idx on public.pulls (created_at desc);
create index if not exists pulls_user_idx    on public.pulls (user_id, created_at desc);
create index if not exists pulls_card_idx    on public.pulls (card_id);

alter table public.pulls enable row level security;

drop policy if exists "pulls: select public or own" on public.pulls;
drop policy if exists "pulls: insert own"           on public.pulls;
drop policy if exists "pulls: update own"           on public.pulls;
drop policy if exists "pulls: delete own"           on public.pulls;

create policy "pulls: select public or own"
  on public.pulls for select to authenticated
  using (visibility = 'public' or user_id = auth.uid());

create policy "pulls: insert own"
  on public.pulls for insert to authenticated
  with check (user_id = auth.uid());

create policy "pulls: update own"
  on public.pulls for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "pulls: delete own"
  on public.pulls for delete to authenticated
  using (user_id = auth.uid());

-- Column privileges: clients may edit caption/visibility only. verified_at (and
-- everything else) is set by the service-role review script, which bypasses RLS.
-- This is what prevents a user from verifying their own pull via the API.
grant select, insert, delete on public.pulls to authenticated;
revoke update on public.pulls from authenticated;
grant update (caption, visibility) on public.pulls to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. pull_reactions — fire / heart / want (want doubles as a demand signal)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.pull_reactions (
  id         uuid primary key default gen_random_uuid(),
  pull_id    uuid not null references public.pulls(id) on delete cascade,
  user_id    uuid not null default auth.uid()
             references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('fire', 'heart', 'want')),
  created_at timestamptz not null default now(),
  unique (pull_id, user_id, kind)
);

create index if not exists pull_reactions_pull_idx on public.pull_reactions (pull_id);
create index if not exists pull_reactions_user_idx on public.pull_reactions (user_id);

alter table public.pull_reactions enable row level security;

drop policy if exists "pull_reactions: select visible" on public.pull_reactions;
drop policy if exists "pull_reactions: insert own"     on public.pull_reactions;
drop policy if exists "pull_reactions: delete own"     on public.pull_reactions;

create policy "pull_reactions: select visible"
  on public.pull_reactions for select to authenticated
  using (exists (
    select 1 from public.pulls p
    where p.id = pull_reactions.pull_id
      and (p.visibility = 'public' or p.user_id = auth.uid())
  ));

create policy "pull_reactions: insert own"
  on public.pull_reactions for insert to authenticated
  with check (user_id = auth.uid());

create policy "pull_reactions: delete own"
  on public.pull_reactions for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.pull_reactions to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. pull-photos storage bucket
-- ─────────────────────────────────────────────────────────────────────────
-- Public-read: a pull photo is meant to be seen (flex + proof). Writes are
-- restricted to the user's own folder ({user_id}/...). 8 MB cap for phone shots.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pull-photos',
  'pull-photos',
  true,
  8388608,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pull-photos: public read"  on storage.objects;
drop policy if exists "pull-photos: owner insert" on storage.objects;
drop policy if exists "pull-photos: owner update" on storage.objects;
drop policy if exists "pull-photos: owner delete" on storage.objects;

create policy "pull-photos: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'pull-photos');

create policy "pull-photos: owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pull-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pull-photos: owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'pull-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pull-photos: owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'pull-photos' and (storage.foldername(name))[1] = auth.uid()::text);
