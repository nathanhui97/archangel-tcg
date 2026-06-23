-- Milestone 3: Storage bucket for Gundam card images
--
-- Creates a public-read bucket "card-images" where the seed script uploads
-- scraped Bandai card art. Public-read because the app needs to render them
-- everywhere (binder, wantlist, search). Only the service-role key can write,
-- so no user can upload/replace card art.

-- ─────────────────────────────────────────────────────────────────────────
-- Bucket
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,                                          -- public-read
  4194304,                                       -- 4 MB cap (alt arts can be ~1-2 MB)
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────
-- Policies on storage.objects
-- ─────────────────────────────────────────────────────────────────────────
-- RLS on storage.objects is enabled by default in Supabase. We only grant
-- SELECT to anon + authenticated. No INSERT/UPDATE/DELETE — the seed script
-- runs with the service_role key, which bypasses RLS entirely.

drop policy if exists "card-images: public read" on storage.objects;

create policy "card-images: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'card-images');
