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

## If the scraper breaks

Bandai's site is a JavaScript SPA, so selectors can shift if they redesign the page.

1. Open `seed-gundam.ts`
2. At the top there's a `SELECTORS` object — every CSS selector lives there
3. Visit `https://www.gundam-gcg.com/en/cards/` in a real browser
4. Open DevTools, inspect the set dropdown / card list / card details
5. Update the selector(s) that no longer match
6. Re-run — upserts mean nothing is lost from previous runs

## Security

- The `service_role` key bypasses Row-Level Security. **Never** commit `.env` or share the key.
- `.env` is gitignored by the root `.gitignore`.
- The seed script only writes to `cards` and `card-images`. It cannot read user data.
