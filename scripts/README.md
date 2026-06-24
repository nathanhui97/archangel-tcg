# Scripts

Server-side scripts that run on your machine. **Never** bundled into the mobile app — they use the Supabase `service_role` key, which has full admin access.

## Setup (one-time)

```bash
cd scripts
cp .env.example .env
# Open .env and fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
# Supabase dashboard > Settings > API > Project API keys > service_role
npm install
```

## Available scripts

### `npm run seed:gundam`

Scrapes the entire Gundam Card Game catalog from `gundam-gcg.com`. ~20–40 min for a full run.

### `npm run seed:onepiece`

Scrapes the entire One Piece Card Game catalog from `en.onepiece-cardgame.com`. ~10–20 min (faster because all card details are inline on the listing page, no per-card fetch).

Both scripts download images, upload them to the `card-images` Supabase Storage bucket, and upsert metadata into the `cards` table. They're idempotent — safe to re-run anytime.

### `npm run smoke-test`

End-to-end backend test. Creates two real test users (Alice + Bob), signs them in with the public anon key, and walks every CRUD path the app uses:

- Profile creation with `auth.uid()` default
- Public/private binder visibility (RLS positive + negative cases)
- Binder item insert / unique-print constraint
- Cross-user RLS leak attempts (should all fail)
- Wantlist add / public-readability
- Matching query (Bob's wantlist ↔ Alice's public binders)

Always cleans up the test users at the end (cascades all owned rows).

Requires a populated `cards` table — run `seed:gundam` or `seed:onepiece` first.

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run smoke-test
```

### Flags (both scripts)

| Flag | Purpose |
|---|---|
| `--max=N` | Only process N cards per set (smoke testing). |
| `--sets=GD01,OP01` | Only process these set codes. |
| `--new-only` | Skip whole sets that already have any cards in the DB. **Use when new sets drop** — takes seconds instead of minutes. |
| `--missing-only` | Per-card check: skip cards already in the DB. **Use after a partial-failure run** to retry only the ones that didn't make it. |

Examples:
```bash
npm run seed:onepiece -- --max=3 --sets=OP01     # smoke test
npm run seed:gundam -- --new-only                  # incremental sync when a new set drops
npm run seed:onepiece -- --missing-only            # retry only the ones that failed last time
npm run seed:onepiece                              # full first-time run
```

### `--new-only` vs `--missing-only`

- **`--new-only`** is fast but coarse — it skips a set entirely if even one card from it is in the DB. Best for adding *brand new* sets when you know everything else is fine.
- **`--missing-only`** is slower (queries per set) but precise — it checks every card. Best for *fixing partial runs* where some cards in known sets failed.

## Future-proofing for new card releases

When Bandai releases a new set:

1. Just run `npm run seed:gundam -- --new-only` (or `:onepiece`).
2. Sets the scraper already knows about are skipped immediately.
3. New sets (auto-discovered from the official site) get scraped fully.
4. ~30 seconds for the check, plus 1-2 min per new set.

Optionally schedule it: a GitHub Action that runs weekly with `--new-only` will keep the catalog fresh with zero manual work. We can wire that up post-launch.

## How the scraper works

The official site (`gundam-gcg.com`) looks like a JS SPA but is actually a server-rendered PHP site that responds to normal POST requests. The scraper:

1. `GET /en/cards/` — discovers every set from the filter dropdown
2. `POST /en/cards/index.php` with `package=XXX` for each set — lists all card IDs in that set
3. `GET /en/cards/detail.php?detailSearch=ID` for each card — fetches full metadata
4. `GET /en/images/cards/card/ID.webp` — downloads the image
5. Uploads image to Supabase Storage (`card-images` bucket), upserts metadata into `cards`

No headless browser needed. ~600ms per card with the polite delay.

## What the scraper extracts

- **ID** (e.g. `GD01-001`) — and splits into:
  - `set_code` — `"GD01"`
  - `number` — `"001"`
  - `art_variant` — `null` for base print, `"p1"` / `"p2"` for alt arts
  - `base_card_id` — `"GD01-001"` for grouping alt prints
- **Name**, **rarity**, **set name**
- **Card type** — normalized to `'Unit' | 'Pilot' | 'Command' | 'Base' | 'Resource'`
- **Color**, **cost**, **level**, **AP**, **HP**, **zone**, **link**
- **Traits** (parsed from `(X) (Y)` format into a `text[]`)
- **Effect text** (HTML stripped, `<br>` → newlines)
- **Source title** (e.g. "Mobile Suit Gundam")
- **Image URL** — points to your Supabase Storage

## If the scraper breaks

Bandai might rename HTML classes if they redesign. Quick fix:

1. Open `seed-gundam.ts`
2. The selectors are: `.js-selectBtn-package` (set dropdown), `.cardItem .cardStr` (card link), `.cardName` / `.rarity` / `.dataBox` (detail page)
3. Visit `https://www.gundam-gcg.com/en/cards/` and inspect with DevTools to find the new class names
4. Re-run — upserts mean nothing is lost from previous runs

## Security

- The `service_role` key bypasses Row-Level Security. **Never** commit `.env` or share the key.
- `.env` is gitignored by the root `.gitignore`.
- The seed script only writes to `cards` and `card-images`. It cannot read user data.
