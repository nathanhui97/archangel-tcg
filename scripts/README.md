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

Scrapes the entire Gundam Card Game catalog from `gundam-gcg.com`, downloads each card image, uploads it to the `card-images` Supabase Storage bucket, and upserts the metadata into the `cards` table.

- **Safe to re-run** at any time (everything is upserted).
- **Polite** — sleeps between image downloads to avoid hammering Bandai's CDN.
- **First run takes ~30–60 minutes** depending on the catalog size (hundreds of cards).
- **Re-runs are fast** for already-seeded cards (re-upload is idempotent).

Run this once on launch, and again whenever Bandai releases a new set.

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
