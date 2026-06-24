# ArchangelTCG — Operations Playbook

> Common tasks, the commands that do them, and what to do when something breaks.
>
> Read `STATUS.md` first for project state. This file is for **how to do things**.

---

## Quick reference

| I want to… | Command |
|---|---|
| Scrape a fresh game catalog for the first time | `npm run seed:gundam` (or `seed:onepiece`) |
| Add only newly-released sets (fast incremental) | `npm run seed:gundam -- --new-only` |
| Retry cards that failed in a previous run | `npm run seed:gundam -- --missing-only` |
| Smoke-test a single set / a few cards | `npm run seed:gundam -- --max=3 --sets=GD01` |
| Verify the backend works end-to-end | `npm run smoke-test` |
| Run the app on my phone | `npx expo start --tunnel` + Expo Go app |
| Check what's in the DB | Supabase Dashboard → SQL Editor (queries below) |

All seed/test commands run from `scripts/` and need `scripts/.env` set up (see below).

---

## One-time setup

### Scripts environment

```bash
cd scripts
cp .env.example .env
# Fill in three values:
#   SUPABASE_URL=...
#   SUPABASE_SERVICE_ROLE_KEY=...    (admin, scripts only — never in app)
#   SUPABASE_ANON_KEY=...            (same as the app's EXPO_PUBLIC_SUPABASE_ANON_KEY)
npm install --strict-ssl=false
```

The `--strict-ssl=false` is only needed on networks that intercept HTTPS (corporate proxies).

### App environment

```bash
# From project root
cp .env.local.example .env.local
# Fill in:
#   EXPO_PUBLIC_SUPABASE_URL=...
#   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
npm install --strict-ssl=false
```

---

## Scraping cards

### First-time full scrape

```bash
cd scripts
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run seed:gundam
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run seed:onepiece
```

Takes 20–40 minutes per game depending on catalog size. Progress prints every 25 cards. Safe to Ctrl+C and re-run.

### A new set was released

Bandai dropped GD05 or OP17 or similar:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run seed:gundam -- --new-only
```

`--new-only` skips any set that already has cards in the DB. Brand new sets are auto-discovered from the official site — **no code change needed for new releases**.

### A previous run failed some cards

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run seed:onepiece -- --missing-only
```

`--missing-only` is precise: it checks each card individually against the DB and only processes the ones not yet there. Use this after seeing `Skipped: N` at the end of a previous run.

### Test the scraper on a small batch

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run seed:gundam -- --max=3 --sets=GD01
```

- `--max=N` caps cards per set
- `--sets=X,Y,Z` restricts to specific set codes

### When the scraper breaks

Bandai might redesign their HTML. Both scrapers have a small set of CSS selectors at the top:

- `seed-gundam.ts` → selectors for `.cardItem`, `.cardName`, `.dataBox`, etc.
- `seed-onepiece.ts` → selectors for `.modalCol`, `.cardName`, `.backCol`, etc.

Visit the official site in your browser, inspect the DOM, update the selectors, re-run with `--missing-only` to fill the gaps.

---

## Testing

### Backend smoke test (no app needed)

```bash
cd scripts
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run smoke-test
```

Creates two real test users (Alice + Bob), signs them in with the public anon key, exercises every CRUD path the app uses, verifies RLS prevents cross-user leaks, then cleans up.

**26 checks** including:
- Profile creation with `auth.uid()` default
- Public/private binder visibility (positive + negative RLS cases)
- Binder item unique-print constraint
- Wantlist add / public-readability
- Matching query (Bob's wantlist ↔ Alice's public binders)
- Matching query does NOT leak private binders

Exit code 0 means everything passes.

### Running the app on your phone

Easiest path with no Xcode required:

1. Install **Expo Go** on your phone (App Store / Play Store, free)
2. From project root:
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 EXPO_NO_TELEMETRY=1 npx expo start --tunnel
   ```
3. Scan the QR code with iPhone Camera or Expo Go (Android)

The `--tunnel` flag uses Expo's servers so phone and laptop don't need to be on the same WiFi. Useful on corporate networks that block LAN traffic.

If `--tunnel` is too slow, fall back to `--lan` (same WiFi) or `--localhost` (simulator only).

### Running on the iOS simulator

Requires Xcode installed.

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx expo start
# press 'i' when the menu appears
```

---

## Database operations

### Apply a migration

Open Supabase dashboard → **SQL Editor** → New query → paste the contents of the migration file → Run.

Migrations live in `supabase/migrations/`, numbered in order. They are all idempotent (`if not exists`, `drop policy if exists`) — safe to re-run.

| File | What it does |
|------|--------------|
| `0001_profiles.sql` | profiles table, RLS, public_profiles view, is_handle_available RPC |
| `0002_cards.sql` | cards table + pg_trgm index + RLS |
| `0003_storage_card_images.sql` | card-images bucket, public-read |
| `0004_add_one_piece.sql` | adds OP columns + expands game/card_type CHECKs |
| `0005_binders.sql` | binders + binder_items with strict per-row RLS |
| `0006_wantlist.sql` | wantlist_items with read-anyone-write-own RLS |

### Useful diagnostic queries

```sql
-- Total cards per game
SELECT game, COUNT(*) FROM cards GROUP BY game;

-- Card distribution by set
SELECT game, set_code, COUNT(*) FROM cards GROUP BY game, set_code
ORDER BY game, set_code;

-- Cards missing an image (should be 0)
SELECT COUNT(*) FROM cards WHERE image_url IS NULL OR image_url = '';

-- Cards with multiple prints (base + alt arts)
SELECT base_card_id, COUNT(*) AS prints
FROM cards WHERE base_card_id IS NOT NULL
GROUP BY base_card_id HAVING COUNT(*) > 1 LIMIT 10;

-- RLS enabled on every public table?
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Card types breakdown
SELECT game, card_type, COUNT(*) FROM cards
GROUP BY game, card_type ORDER BY game, COUNT(*) DESC;
```

### Storage bucket reset (nuclear option)

If you need to wipe all card images:

```sql
DELETE FROM storage.objects WHERE bucket_id = 'card-images';
```

Then re-run the scrapers. Cards table is untouched; only the image storage is wiped.

---

## Troubleshooting

### `TypeError: fetch failed` / `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`

Your network intercepts HTTPS (corporate proxy, Zscaler, etc.). Workarounds:

- **npm install**: add `--strict-ssl=false`
- **Anything Node**: prefix with `NODE_TLS_REJECT_UNAUTHORIZED=0`
- **Expo**: add `EXPO_NO_TELEMETRY=1` too

Proper long-term fix: install your company's root CA cert and point Node at it via `NODE_EXTRA_CA_CERTS=/path/to/cert.pem`. The env-var workarounds are fine for local dev only — never use in production.

### Storage upload "object exceeded maximum allowed size"

The `card-images` bucket has a 4 MB cap. If Bandai releases bigger images:

```sql
UPDATE storage.buckets SET file_size_limit = 8388608 WHERE id = 'card-images';
-- (8 MB)
```

### `relation "..." does not exist`

A migration hasn't been run yet. Apply them in order from `supabase/migrations/`.

### Scraper output looks frozen

It isn't — there's an intentional 300–800 ms polite delay between cards so we don't hammer Bandai's CDN. Wait for the next progress line.

### "Network request failed" in the app

Phone can't reach Expo dev server. Try `--tunnel` instead of default mode, or check that phone has internet.

---

## Adding a new game later (post-launch)

The architecture supports more games. When you want to add (e.g.) Union Arena:

1. Write a new SQL migration that:
   - Expands the `cards.game` CHECK to include `'union_arena'`
   - Expands the `cards.card_type` CHECK to include UA's types
   - Adds any UA-specific columns (nullable)
2. Copy `scripts/seed-onepiece.ts` to `scripts/seed-unionarena.ts`
3. Adjust the selectors and field parsing for UA's site (most Bandai TCG sites use the same PHP-form pattern)
4. Add `seed:unionarena` to `scripts/package.json`
5. Expand `Game` and `CARD_TYPE` types in `types/index.ts`
6. Add the new game to `GAME_LABELS`

Most of the binder/wantlist/matching UI works for free because `game` is a column, not a structural distinction.

---

## File map

```
ArchangelTCG/
├── PLAYBOOK.md           ← this file
├── STATUS.md             ← project progress
├── CLAUDE.md             ← agent context (conventions, decisions)
├── doc/                  ← original spec & knowledge base
├── app/                  ← Expo Router screens
├── components/           ← reusable UI (CardSearch, AddToBinderSheet)
├── lib/                  ← Supabase client, auth, hooks (cards/binders/wantlist)
├── types/                ← shared TypeScript types
├── supabase/migrations/  ← SQL schema (applied via Supabase SQL Editor)
└── scripts/              ← server-only scripts (seeders, smoke test)
    ├── seed-gundam.ts
    ├── seed-onepiece.ts
    └── smoke-test.ts
```
