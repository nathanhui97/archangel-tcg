-- Binder verification + concierge (Phase 1).
--
-- A user snaps their binder pages and submits; the founder reviews the photos,
-- verifies the binder (sets binders.verified_at) and can hand-add cards from the
-- photo (build-binder script). One submission = both verification AND the source
-- for concierge card entry.
--
-- Photos are private — they reuse the existing `pull-photos` bucket (owner-write
-- to their own folder, service-role reviewer reads via signed URLs). No bucket
-- change needed. Idempotent — safe to re-run.

create table if not exists public.binder_verifications (
  id           uuid primary key default gen_random_uuid(),
  binder_id    uuid not null references public.binders(id) on delete cascade,
  user_id      uuid not null default auth.uid()
               references public.profiles(id) on delete cascade,
  photo_paths  text[] not null,                       -- paths in pull-photos bucket
  note         text,                                  -- optional user note
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz
);

create index if not exists binder_verifications_status_idx on public.binder_verifications (status, submitted_at);
create index if not exists binder_verifications_binder_idx on public.binder_verifications (binder_id);
create index if not exists binder_verifications_user_idx   on public.binder_verifications (user_id);

alter table public.binder_verifications enable row level security;

drop policy if exists "binder_verifications: select own" on public.binder_verifications;
drop policy if exists "binder_verifications: insert own" on public.binder_verifications;

-- Owner reads their own submissions (to show the pending state).
create policy "binder_verifications: select own"
  on public.binder_verifications for select to authenticated
  using (user_id = auth.uid());

-- Owner submits, but only for a binder they actually own.
create policy "binder_verifications: insert own"
  on public.binder_verifications for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.binders b where b.id = binder_id and b.user_id = auth.uid())
  );

-- No client UPDATE/DELETE: status + binders.verified_at are set by the review
-- script (service role, bypasses RLS). This is what prevents self-verification.
grant select, insert on public.binder_verifications to authenticated;
