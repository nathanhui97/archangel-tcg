# ArchangelTCG — Project Status

> Keep this file updated as milestones are completed. Read it at the start of every session.

---

## What we're building

A local trading card game app (iOS + Android) where **Gundam Card Game** players list their binder cards and wantlist, then get matched with nearby players to trade in person at a local game shop.

---

## Key decisions (locked in)

- **App name:** "ArchangelTCG" is a placeholder — final name TBD, swap during Milestone 9
- **Platform:** iOS + Android from one Expo codebase. Mac available for local simulator.
- **Launch game:** Gundam Card Game only. One Piece parked for post-launch.
- **Binders:** Users can create as many named binders as they want, each toggled public or private
- **Matching:** Per-game only. Gundam wantlists match Gundam binders within distance.
- **Trades:** In-person only at launch. Meet at local game shop.
- **Card data source:** Scrape `https://www.gundam-gcg.com/en/cards/` directly. Download images and store in **Supabase Storage** (`card-images` bucket). `cards.image_url` points to the Supabase Storage URL.
- **Card sync:** Manual seed script in `scripts/seed-gundam.ts`. Re-run when new sets drop. Uses upsert.
- **Auth method:** Email **magic link** via Supabase Auth. No password. Apple/Google sign-in can be added post-launch if friction is real.
- **Location strategy:** Capture once via `expo-location`, **round to 2 decimals (~1.1 km grid)** before storing. Match radius default: **25 km**. Never expose raw coords to the client.
- **Admin portal:** Not needed for launch — manage via Supabase dashboard directly.

---

## Security principles (apply to every milestone)

1. **Row-Level Security on every table.** RLS is the source of truth — never rely on client-side checks for data protection.
2. **Secrets stay server-side.** `.env.local` is gitignored. Service-role keys only used in `scripts/` (never bundled in the app).
3. **Sensitive tokens in SecureStore.** Use `expo-secure-store` (iOS Keychain / Android Keystore) for auth session, not AsyncStorage.
4. **Email never exposed.** Only `handle` is public. Email stays in `auth.users`.
5. **Location is approximate.** Always round before storing. Distance computed server-side via SQL function. Raw lat/lng never leaves the database.
6. **No PII in URLs or query strings.** No locations, no emails, no internal IDs that leak info.
7. **Validate at the boundary.** Every Supabase RPC validates inputs. Handle length, format, profanity check.
8. **Rate-limit auth.** Supabase handles magic-link rate-limiting; don't disable it.
9. **Storage bucket policies.** `card-images` is public-read (images are meant to be viewed). User-uploaded photos go in a separate bucket with per-user read policies.
10. **Logged-out by default.** No data should render before auth state is confirmed.

---

## Data model (source of truth)

```
profiles      ( id uuid pk = auth.uid, handle text unique, games text[],
                lat float, lng float, created_at )        -- lat/lng = ROUNDED to 2 decimals

cards         ( id text pk, game text, name text, set_name text,
                number text, image_url text )              -- image_url = Supabase Storage URL

binders       ( id uuid pk, user_id uuid fk, name text,
                is_public bool, created_at )

binder_items  ( id uuid pk, binder_id uuid fk, card_id text fk,
                quantity int, condition text, is_foil bool, photo_url text )

wantlist_items( id uuid pk, user_id uuid fk, card_id text fk )

conversations ( id uuid pk, user_a uuid, user_b uuid, created_at )

messages      ( id uuid pk, conversation_id uuid fk, sender_id uuid,
                body text, created_at )

push_subscriptions ( user_id uuid, token text, platform text )
```

Matches are **computed by query, never stored.**

---

## Infrastructure

| Service | Detail | Status |
|---|---|---|
| GitHub | github.com/nathanhui97/archangel-tcg | ✅ Live |
| Supabase | xlytsgrrncoxitufmfqj.supabase.co | ✅ Created, `.env.local` configured |
| Supabase Storage `card-images` bucket | Public-read, holds scraped Gundam card images | ⏳ Create before Milestone 3 |
| Apple Developer | $99/yr, identity verification ~1–3 days | ⏳ Set up by Milestone 5 |
| Google Play | $25 one-time, ~24h review | ⏳ Set up by Milestone 5 |
| EAS Build | Free tier for Expo cloud builds | ⏳ Set up by Milestone 5 |
| ~~Vercel~~ | **Not needed** — we're a native app, not a web app | N/A |

---

## Tech stack

- **Expo** (React Native) + **Expo Router** — iOS + Android, file-based routing
- **NativeWind** — Tailwind syntax for React Native
- **Supabase** — Auth, Postgres DB, Realtime (chat), Storage (card + user photos), RLS
- **expo-secure-store** — Auth session storage (Keychain / Keystore)
- **expo-location** — Location capture (with permission flow)
- **expo-notifications** — Push notifications (iOS + Android, no VAPID needed)
- **expo-image-picker** — Camera for binder card photos
- **EAS Build** — Cloud builds for App Store + Play Store

---

## Milestone progress

| # | Milestone | Status | Notes |
|---|---|---|---|
| 1 | App skeleton | ✅ Done | Expo + NativeWind + Supabase client. Pushed to GitHub. |
| 2 | Auth + profile | ⏳ Active | Magic-link auth, profile (handle + rounded location). RLS on `profiles`. SecureStore for tokens. |
| 3 | Card catalog + search | — | Scrape `gundam-gcg.com` → upload images to Supabase Storage → upsert metadata. `pg_trgm` index on `cards.name` for typeahead. |
| 4 | Binder | — | Create named binders, add cards, public/private toggle. RLS: own binders fully; others' only if `is_public`. |
| 5 | Wantlist | — | Same search-to-add flow. **Also: set up Apple Dev + Google Play accounts now** |
| 6 | Matching screen | — | Query: wantlist ↔ public `binder_items`, same game, within 25 km. Server-side distance via PostGIS or `earth_distance`. |
| 7 | Push notifications | — | expo-notifications. Supabase trigger on insert of public `binder_item` → check for nearby wantlist matches → push. **TestFlight + Internal Testing builds by now.** |
| 8 | Messaging | — | Supabase Realtime 1:1 chat. Suggest local game shop as meetup. |
| 9 | Polish + launch | — | Swap placeholder name + icons. App Store + Play Store submission. Onboard first 20–50 players. |

---

## To start a new session

1. Read this file (`STATUS.md`)
2. Read `CLAUDE.md` for code conventions
3. Read `doc/ai-agent-knowledge-base.md` for full project rules
4. Check the milestone table above for where to pick up
5. **Always build one milestone at a time.** Never scaffold ahead.
6. **Security first** — see "Security principles" section above.
