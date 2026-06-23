# Supabase Migrations

SQL files in `migrations/` are the source of truth for the database schema. Apply them in numeric order.

## How to apply a migration

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new)
2. Paste the contents of the migration file
3. Click **Run**

Migrations are written idempotently (`if not exists`, `drop policy if exists`), so re-running one is safe.

## Migration order

| File | What it does |
|------|--------------|
| `0001_profiles.sql` | Creates `profiles` table, RLS policies, `public_profiles` view, `is_handle_available()` function |

## Conventions

- Every table has **Row-Level Security enabled** before any policies are written.
- Sensitive columns are exposed via **views**, never directly. Clients query `public_profiles`, not `profiles`.
- RPC functions use `security definer` + `set search_path = public` to prevent search-path injection.
- The `service_role` key is only used in `scripts/` (the seed script), never in the app.
