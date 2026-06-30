# Bindar — Project Status

> *Project codename was "ArchangelTCG" during early dev. Locked the real name on 2026-06-24: **Bindar** (Binder + Radar). Theme black + phosphor green to come at Milestone 9. Folder name and GitHub repo URL still say `archangel-tcg` — that's just the path, not the brand.*

> Keep this file updated as milestones are completed. Read it at the start of every session.

---

## What we're building

A local trading card game app (iOS + Android) where **Gundam Card Game** players list their binder cards and wantlist, then get matched with nearby players to trade in person at a local game shop.

---

## Key decisions (locked in)

- **App name: Bindar** (Binder + Radar). Locked 2026-06-24. **Black + phosphor-green theme is now implemented** (2026-06-25) from the Claude Design comp "Bindar Screens" — every already-built screen re-skinned off the placeholder gray/indigo. See "Design system" below.
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
| 2 | Auth + profile | ✅ Done | Email OTP auth (6-digit code), profile (handle + rounded location). RLS on `profiles`. SecureStore for tokens. |
| 3 | Card catalog + search | ✅ Done | Cheerio scrapers for Gundam + One Piece. Cards table + RLS. Storage bucket. Search component + hook. `--new-only` incremental sync. Multi-game schema (migration 0004). |
| 4 | Binders | ✅ Done + overhauled (2026-06-26) | Named binders, public/private. **Cover card** (pick any; migration 0013) + name header. Add cards with **per-card quantity**. **Duplicates allowed** as separate entries (migration 0012). **Drag-to-reorder** (migration 0011, custom reanimated) + iPhone-style **edit mode** (hold to jiggle, ✕ to delete). Themed confirm dialogs. Binders tab = horizontal rows with **rarity breakdown**. |
| 5 | Wantlist | ✅ Done | Tap-to-add from search with instant toast feedback. Long-press to remove. RLS: all authenticated can read (powers matching), own-only writes. **Reminder: set up Apple Dev + Google Play accounts soon** |

## Backend verification (2026-06-24)

**Smoke test passed 26/26.** Every CRUD path, every RLS rule, the matching query, and the cross-user leak prevention all verified end-to-end via `scripts/smoke-test.ts`. The backend is provably solid.

Mobile UI testing was not possible on the current work laptop due to corporate SSL inspection causing `--force` installs which produced a slightly inconsistent `node_modules` tree. The app code itself compiles cleanly (`npx tsc --noEmit` passes); the issue is purely runtime-environmental. When tested from a clean machine (personal Mac or after IT installs the corporate CA cert via `NODE_EXTRA_CA_CERTS`), the app should run as expected.
| 6 | Matching screen | ✅ Done (verified 2026-06-26) | Client-side matching (`lib/matches.ts`): your wantlist ∩ nearby public `binder_items` + nearby wants ∩ your public binders → strength + distance sort. `matches.tsx` + Trade-tab entry. |
| 7 | Push notifications | ✅ Done (2026-06-28) | `push_tokens` table + `send_push()` + Postgres triggers POST to Expo via `pg_net` (migration 0018): new message/proposal/inquiry → other party; proposal accept/decline → proposer. App registers token on login (`lib/push.ts`). **Fires only on a dev/prod build, not Expo Go.** **Nearby-match radar push done** (migration 0020): adding a card to a public binder notifies nearby wanters ("@owner near you listed CARD") via `radar_recipients()` + 25 km earthdistance. |
| 8 | Messaging + trades | ✅ Done (verified 2026-06-26) | Inquire-first flow + 1:1 chat (polled, 4s). **Structured proposals** (give/get cards + cash, migration 0015) shown as proposal cards with Accept/Decline. **Card-context requests** as in-chat card messages, 3-per-card cap (migration 0017). Messages tab + inbox. Full loop (request → propose → accept → reply) verified via `scripts/fake-trader-reply.ts`. Tables: trades/messages (0014). |
| 9 | Polish + launch | 🟡 Partial | Phosphor-green design system applied to all screens. **Dev build path set up** (keyboard-controller + `eas.json` + `expo-dev-client`) — needed for keyboard + push. **Social sign-in app code done (2026-06-28)** — native Apple + Google via Supabase `signInWithIdToken` (`lib/social-auth.ts` + `login.tsx`, hidden in Expo Go); external OAuth config still pending, see `doc/social-signin-setup.md`. **Account deletion** RPC (migration 0019, Apple 5.1.1(v)). **City label** display (migration 0021, on-device reverse-geocode; stored coords stay rounded). **Onboarding wizard done (2026-06-28)** — guided post-signup flow (`app/(app)/onboarding.tsx`): welcome → add wishlist → add trade cards (lazily creates a public "For Trade" binder, NM/qty 1) → recap. Skippable; `GetOnRadar` checklist remains the fallback. Still to do: real app icon/splash, store submission, onboard first players. |

## Session log — 2026-06-26

Big day. Verified the app runs on device (Android, Expo Go) and shipped the trade loop end-to-end.

- **Binders overhaul** — drag-to-reorder, iPhone-style edit/jiggle delete, duplicates as separate entries, per-card quantity on add, pick-a-cover + name header, themed confirm/rename dialogs, Binders tab as horizontal rows with rarity breakdown.
- **Trades & messaging (M8)** — inquire-first flow, 1:1 chat (polled), structured proposals (give/get + cash) as proposal cards with Accept/Decline, card-context requests as in-chat card bubbles (3-per-card cap), Messages tab + inbox. **Full loop verified** with `scripts/fake-trader-reply.ts`.
- **Push groundwork (M7)** — `push_tokens` + `pg_net` triggers + token registration (fires on dev build only).
- **Keyboard** — moved to `react-native-keyboard-controller` (guarded so Expo Go still runs); proper fix activates on the dev build.

**Migrations now go to 0021** — through 0018 applied 2026-06-26 (0011 reorder, 0012 dup, 0013 cover, 0014 trades, 0015 proposals, 0016 about-card [superseded by 0017], 0017 inquiry msgs, 0018 push). Added since: **0019** delete-account RPC, **0020** radar push (`radar_recipients` + trigger on public `binder_items`), **0021** `profiles.city`. **Confirm 0019–0021 are applied in Supabase.**

**Next:** do the **EAS dev build** (`eas build --profile development --platform android`) → fixes keyboard + enables push. Then build the nearby-match radar push + onboarding nudge. Apple Dev + Google Play accounts still not set up.

## Session log — 2026-06-28

- **Nearby-match radar push (M7 follow-up)** — migration 0020: adding a card to a public binder pings nearby wanters via `radar_recipients()` + 25 km earthdistance. Closes the last M7 item → M7 now ✅.
- **Account deletion** — migration 0019: `delete_my_account()` security-definer RPC (Apple 5.1.1(v)); FK cascade wipes all owned rows.
- **City label** — migration 0021 + reverse-geocode in `profile-setup.tsx`; stored lat/lng stay rounded, city is display-only and not in `public_profiles`.
- **Native social sign-in** — Apple + Google via Supabase `signInWithIdToken` (`lib/social-auth.ts` + `login.tsx`); external OAuth config still pending (`doc/social-signin-setup.md`).
- **Onboarding wizard** — new `app/(app)/onboarding.tsx`: `profile-setup` now hands off here. Welcome → wishlist (`CardPicker` → `addToWantlist`) → trade cards (`CardPicker` allowMultiple → lazily creates a public "For Trade" binder, then `addCardsToBinder` at NM/qty 1) → recap. Skippable with nudge; `GetOnRadar` checklist stays as the fallback. Reuses existing components — no migration, no new deps. `tsc --noEmit` clean; **not yet device-tested.**

**Migrations now go to 0021** (0019 delete-account, 0020 radar push, 0021 city). **Confirm 0019–0021 applied in Supabase.**

**Next:** EAS dev build to verify push + the onboarding flow on-device; then app icon/splash + store submission.

## Design system (2026-06-25)

Imported the Claude Design comp **"Bindar Screens.dc.html"** (27-screen tactical-radar design) and built the foundation + re-skinned every existing screen. Net-new feature screens in the comp (Card Detail, Messages/Chat, Trader Profile, Trade/Cash proposals, Matches, cold-start empties) were intentionally **not** built — they depend on Milestones 6–8 backend.

**Theme tokens** (`tailwind.config.js` + `lib/theme.ts`):
- Background `#050706`, surfaces `#0E1512`, green-tinted hairline borders
- Single accent: phosphor green `#35F58A` (ink `#04140C` on top)
- Gold `#C9A84A` = Foil only · Amber `#F5C24A` = Pending only · Red `#FF6B6B` = destructive only
- Fonts: **Space Grotesk** (prose/headings) + **JetBrains Mono** (codes, numbers, distances, uppercase labels), loaded in `app/_layout.tsx` via `@expo-google-fonts/*`

**Reusable primitives** (`components/ui/`): `RadarLogo` (canonical Bindar mark + animated sweep — reuse for app icon/splash), `Button`, `Chip`, `Badge`, `CardThumb`, `StatusDot`, `MonoLabel`, `Card`, `PressRow`, `Cursor`, `DistanceTag`.

New deps: `@expo-google-fonts/space-grotesk`, `@expo-google-fonts/jetbrains-mono`, `expo-font`, `react-native-svg`.

> **Build note (Windows):** `npx expo export` fails at the `hermesc.exe` bytecode step on RN 0.81 internals (a known Windows Hermes issue, unrelated to app code). The JS bundle itself is verified clean — `npx expo export --no-bytecode` and `npx tsc --noEmit` both pass. EAS device builds use a different hermesc and are unaffected.

---

## Screen map (current)

### Navigation structure
Bottom tab bar (**4 tabs**, Messages added 2026-06-26) → stack screens push on top.
> Old `Browse` + `Wanted` tabs were merged into the single `Trade` tab (2026-06-25).

| Tab | File | What it shows |
|---|---|---|
| Trade | `(tabs)/trade.tsx` | Segmented **Listed for Trade** / **Wishlist** of nearby cards. Game + radius filters, search. Surfaces a "N matches near you" entry → Matches. |
| Binders | `(tabs)/my-cards.tsx` | "For trade" strip, Wantlist, and **Your Binders** (horizontal rows w/ cover + rarity). |
| Messages | `(tabs)/messages.tsx` | Trade inbox: requests + chats, unread dots; badge for pending requests. |
| Profile | `(tabs)/profile.tsx` | Handle, location status, willing-to-ship toggle, sign out. |

### Stack screens (pushed on top of tabs)
| Screen | File | Notes |
|---|---|---|
| New binder | `binders/new.tsx` | `?type=trade\|collection`. Defaults public for trade, private for collection. |
| Binder detail | `binders/[id].tsx` | Cover + name header; 3×3 grid; add (qty), reorder, edit-mode delete, ••• menu. |
| Wantlist / Add | `wantlist/index.tsx`, `wantlist/add.tsx` | Full wantlist mgmt + card search add. |
| Profile setup | `profile-setup.tsx` | Onboarding: handle + location. Shown once on first login → hands off to the onboarding wizard. |
| Onboarding | `onboarding.tsx` | Post-signup guided wizard: welcome → add wishlist → add trade cards (lazily creates a public "For Trade" binder) → recap. Skippable; runs once after profile setup. |
| Matches | `matches.tsx` | Nearby traders you overlap with (you-get / you-give + strength). |
| Card detail | `card/[id].tsx` | Card + "available near you" holders, each with a **Request** button. |
| Trader profile | `trader/[handle].tsx` | A trader's public cards + wants; **Inquire** to open a chat. |
| Propose | `propose.tsx` | Build a give/get (+ cash) proposal for a trade. |
| Chat | `chat/[id].tsx` | 1:1 thread: text + inquiry-card + proposal-card bubbles; Propose; Accept/Decline. |
| For trade / Invite | `trades.tsx`, `invite.tsx` | My public cards grid · invite/share. |

### Pending screens (not built yet)
- ~~**Onboarding trade binder prompt**~~ — ✅ Built 2026-06-28 as the post-signup onboarding wizard (`app/(app)/onboarding.tsx`).
- ~~**Nearby-match radar push**~~ — ✅ Done (migration 0020); fires on a dev/prod build only.
- *(none outstanding — remaining M9 work is assets + store submission, not screens)*

---

## To start a new session

1. Read this file (`STATUS.md`)
2. Read `CLAUDE.md` for code conventions
3. Read `PLAYBOOK.md` for **how to do common operational tasks** (scrape, test, debug)
4. Read `doc/ai-agent-knowledge-base.md` for full project rules
5. Check the milestone table above for where to pick up
6. **Always build one milestone at a time.** Never scaffold ahead.
7. **Security first** — see "Security principles" section above.
