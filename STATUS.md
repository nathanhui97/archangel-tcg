# Bindar — Project Status

> *Project codename was "ArchangelTCG" during early dev. Locked the real name on 2026-06-24: **Bindar** (Binder + Radar). Theme black + phosphor green to come at Milestone 9. Folder name and GitHub repo URL still say `archangel-tcg` — that's just the path, not the brand.*

> Keep this file updated as milestones are completed. Read it at the start of every session.

---

## What we're building

A local trading card game app (iOS + Android) where **Gundam Card Game** players list their binder cards and wantlist, then get matched with nearby players to trade in person at a local game shop.

---

## Key decisions (locked in)

- **App name: Bindar** (Binder + Radar). Locked 2026-06-24. Black + phosphor green theme planned for Milestone 9 polish (placeholder dark gray + indigo for now).
- **Platform:** iOS + Android from one Expo codebase. Mac available for local simulator.
- **Launch game:** Gundam Card Game only. One Piece parked for post-launch.
- **Binders:** Users can create as many named binders as they want, each toggled public or private
- **Matching:** Per-game only. Gundam wantlists match Gundam binders within distance.
- **Trades:** In-person only at launch. Meet at local game shop.
- **Card data source:** Scrape `https://www.gundam-gcg.com/en/cards/` directly. Download images and store in **Supabase Storage** (`card-images` bucket). `cards.image_url` points to the Supabase Storage URL.
- **Card sync:** Manual seed script in `scripts/seed-gundam.ts`. Re-run when new sets drop. Uses upsert.
- **Auth method:** Email **6-digit OTP code** via Supabase Auth (`signInWithOtp` → `verifyOtp`). No password, no leaving the app to tap a link. Apple/Google sign-in can be added post-launch if friction is real.
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
| 2 | Auth + profile | ⏳ Active | Email OTP auth (6-digit code), profile (handle + rounded location). RLS on `profiles`. SecureStore for tokens. |
| 3 | Card catalog + search | ✅ Code + scrapers done | Cheerio scrapers for Gundam + One Piece. Cards table + RLS. Storage bucket. Search component + hook + Browse screen. `--new-only` flag for incremental sync when new sets drop. Multi-game schema (migration 0004). |
| 4 | Binders | ✅ Done | Multiple named binders, public/private toggle. Add cards via search. Quantity/condition/foil per item. Duplicate adds bump quantity. RLS: own fully, others read-only when public. Long-press to delete. |
| 5 | Wantlist | ✅ Done | Tap-to-add from search with instant toast feedback. Long-press to remove. RLS: all authenticated can read (powers matching), own-only writes. **Reminder: set up Apple Dev + Google Play accounts soon** |

## Backend verification (2026-06-24)

**Smoke test passed 26/26.** Every CRUD path, every RLS rule, the matching query, and the cross-user leak prevention all verified end-to-end via `scripts/smoke-test.ts`. The backend is provably solid.

Mobile UI testing was not possible on the current work laptop due to corporate SSL inspection causing `--force` installs which produced a slightly inconsistent `node_modules` tree. The app code itself compiles cleanly (`npx tsc --noEmit` passes); the issue is purely runtime-environmental. When tested from a clean machine (personal Mac or after IT installs the corporate CA cert via `NODE_EXTRA_CA_CERTS`), the app should run as expected.
| 6 | Matching screen | — | Query: wantlist ↔ public `binder_items`, same game, within 25 km. Server-side distance via PostGIS or `earth_distance`. |
| 7 | Push notifications | — | expo-notifications. Supabase trigger on insert of public `binder_item` → check for nearby wantlist matches → push. **TestFlight + Internal Testing builds by now.** |
| 8 | Messaging | — | Supabase Realtime 1:1 chat. Suggest local game shop as meetup. |
| 9 | Polish + launch | — | Swap placeholder name + icons. App Store + Play Store submission. Onboard first 20–50 players. |

---

## Screen map (current)

### Navigation structure
Bottom tab bar (4 tabs) → stack screens push on top.

| Tab | File | What it shows |
|---|---|---|
| Browse | `(tabs)/browse.tsx` | Cards in nearby trade binders. Game + radius chips. Card search. "Want" badge on wantlisted cards. |
| Wanted | `(tabs)/wanted.tsx` | Wantlists from nearby users, grouped by card. Shows who wants each card + distance. |
| My Cards | `(tabs)/my-cards.tsx` | My trade binders, collections, and wantlist. Entry point to manage everything. |
| Profile | `(tabs)/profile.tsx` | Handle, location status, willing-to-ship toggle, sign out. |

### Stack screens (pushed on top of tabs)
| Screen | File | Notes |
|---|---|---|
| New binder | `binders/new.tsx` | Accepts `?type=trade\|collection` param. Defaults public for trade, private for collection. |
| Binder detail | `binders/[id].tsx` | View + manage cards in a binder. |
| Wantlist | `wantlist/index.tsx` | Full wantlist management. |
| Add to wantlist | `wantlist/add.tsx` | Card search → add to wantlist. |
| Profile setup | `profile-setup.tsx` | Onboarding: handle + location. Shown once on first login. |

### Pending screens (not built yet)
- **Messaging** — 1:1 chat (Milestone 8)
- **Onboarding trade binder prompt** — guide new users to create their first trade binder after profile setup

---

## To start a new session

1. Read this file (`STATUS.md`)
2. Read `CLAUDE.md` for code conventions
3. Read `PLAYBOOK.md` for **how to do common operational tasks** (scrape, test, debug)
4. Read `doc/ai-agent-knowledge-base.md` for full project rules
5. Check the milestone table above for where to pick up
6. **Always build one milestone at a time.** Never scaffold ahead.
7. **Security first** — see "Security principles" section above.
