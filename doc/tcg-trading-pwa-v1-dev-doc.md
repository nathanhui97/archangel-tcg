# Local TCG Trading PWA — v1 Development Doc

*Companion to the v1 Product Spec. This is the build plan: stack, data model, the tricky parts, and a milestone order you can hand to an AI coding assistant one piece at a time.*

---

## How to use this doc

You're building with AI help, so the goal here is to give you (and your AI assistant) clear, concrete direction — a chosen stack, a defined data model, and bite-sized milestones. Build one milestone at a time, test it with real data, then move on. Don't let the AI scaffold the whole app at once; you won't be able to debug it.

---

## Recommended stack

Chosen for one thing: maximum buildable-by-a-solo-non-dev-with-AI, minimum ops.

- **Next.js (React) + TypeScript** — the most AI-supported framework; handles your UI and lightweight backend (API routes) in one codebase, and does PWA well.
- **Supabase** — your entire backend in a box: Postgres database, built-in auth (email + Google/Apple), realtime (for chat), file storage (card photos), and row-level security. Postgres matters here because matching binders to wantlists is a relational query — exactly what SQL is good at.
- **Vercel** — one-click deploys, free tier, pairs natively with Next.js. Instant updates (your PWA advantage).
- **Card data API** — **apitcg.com**, which covers both Gundam and One Piece (plus Pokémon, Magic, Digimon, Dragon Ball) through one integration. optcgapi.com is a free One Piece-only fallback. Card *images* are Bandai's copyright — display them via the API/official source, don't claim or relicense them.
- **Tailwind CSS** — fast styling, AI writes it fluently.

Everything above has a free tier generous enough for a 20–50 player launch. **Starting cost: ~$0** (optional ~$12/yr for a domain).

---

## Accounts & setup you'll need

1. Supabase project (free).
2. Vercel account (free), linked to a GitHub repo.
3. Card API access (apitcg.com — check their docs for key/usage; covers Gundam + One Piece).
4. Web Push **VAPID keys** (generated once, for notifications).
5. A GitHub repo (your AI assistant pushes code here; Vercel auto-deploys).

---

## Architecture overview

```
[ PWA frontend: Next.js + React ]
        |  (Supabase client SDK)
        v
[ Supabase ]
   - Auth (email / social)
   - Postgres DB (profiles, cards, binders, wantlists, messages)
   - Realtime (chat updates)
   - Storage (card photos)
        |
[ Next.js API route / Supabase Edge Function ]
   - Match computation
   - Send web-push on new match
        |
[ Card API (apitcg.com: Gundam + One Piece) ] -> seeded into your `cards` table
```

You mostly talk to Supabase directly from the frontend (it's safe via row-level security). A small server function handles match-and-notify.

---

## Data model

Core tables (Postgres / Supabase). Keep it this lean for v1.

```
profiles
  id (uuid, = auth user id)
  handle (text, unique)
  games (text[])          -- Gundam and/or One Piece
  lat, lng (float)        -- APPROXIMATE location only (see Privacy)
  created_at

cards                      -- the catalog, seeded from apitcg.com for BOTH games
  id (text)               -- use the API's card id
  game (text)             -- 'gundam' | 'one_piece' (matching is per-game)
  name (text)
  set_name (text)
  number (text)
  image_url (text)

binder_items
  id (uuid)
  user_id (uuid -> profiles.id)
  card_id (text -> cards.id)
  quantity (int)
  condition (text)        -- NM, LP, etc.
  is_foil (bool)
  is_public (bool)
  photo_url (text, null)

wantlist_items
  id (uuid)
  user_id (uuid -> profiles.id)
  card_id (text -> cards.id)

conversations
  id (uuid)
  user_a (uuid), user_b (uuid)
  created_at

messages
  id (uuid)
  conversation_id (uuid -> conversations.id)
  sender_id (uuid)
  body (text)
  created_at

push_subscriptions
  user_id (uuid)
  subscription (jsonb)     -- the Web Push subscription object
```

*Matches are computed by a query, not stored as a table (see below).*

---

## The tricky parts (where to spend care)

### 1. Card data + search — *make this fast or the app dies*
- **Seed your `cards` table** with the full card sets for **both Gundam and One Piece** from apitcg.com (one-time import script per game, tagging each row's `game`). Don't hit the API live on every keystroke — you'll be rate-limited and slow.
- Build **typeahead search** against your own `cards` table (Postgres full-text or `ilike` on name), scoped to the game the user is currently in. Type → instant results → tap to add. This is the single most important UX moment in the app.
- Card photos: optional, stored in Supabase Storage via `<input type="file" accept="image/*" capture="environment">` (opens the camera on phones).

### 2. Location & privacy — *get this right*
- Store **approximate** location only. On signup, capture coarse location (e.g., snap to a ~1–2 km grid, or let users pick a nearby area/postal prefix). **Never store or expose exact GPS coordinates or addresses.**
- Distance: either PostGIS (Supabase supports it) or a simple haversine calculation. "Within X km" filtering.
- Never put location in a URL.

### 3. Matching — *the magic moment*
The core query, run for the logged-in user:

> Find other users, within X km, whose **public binder_items** contain any `card_id` on **my wantlist** — and the reverse (users near me who **want** cards in my binder).

Matching is **within a single game** (`cards.game` must match on both sides) — Gundam wantlists match Gundam binders only. In SQL terms it's a join of `wantlist_items` (mine) against `binder_items` (theirs, `is_public = true`), filtered by distance between our profiles. Return matched users + which cards overlap. Surface this as:
- "Players near you have **N** cards on your wantlist"
- "Players near you want **N** cards in your binder"

Run it on the match screen, and on a schedule/trigger to fire **push notifications** when a *new* match appears.

### 4. Messaging
- 1:1 chat using **Supabase Realtime** — subscribe to new rows in `messages` for the conversation. Simple, no extra infra.

### 5. PWA shell
- `manifest.json`: app name, icons (192/512px), `display: standalone`, theme color.
- **Service worker**: cache the app shell for fast loads + handle push events.
- Show an "Add to Home Screen" prompt after first meaningful action.

### 6. Push notifications
- Generate VAPID keys once. On the client, request permission → subscribe → store the subscription in `push_subscriptions`.
- A server function sends pushes (Web Push protocol) when a new match is found.
- **iOS caveat:** web push only works when the PWA is **added to the home screen** (iOS 16.4+). Prompt iOS users to install. Test this early — notifications are your retention engine.

### 7. Auth
- Supabase Auth: email magic-link or password, plus Google/Apple social. Create a `profiles` row on first sign-in.

---

## Security & privacy (don't skip)

- Turn on **Row-Level Security** in Supabase: users can read their own data and *only public* binder items of others; private binders never leave the database.
- Approximate location only; never expose exact coordinates or real names beyond a handle.
- No personal data in URLs or query strings.
- For in-person trades, the app should nudge meeting at **public local game shops**, never private addresses.

---

## Build milestones (hand to your AI assistant in order)

Each is a self-contained chunk. Build, deploy to Vercel, test on your phone, then continue.

1. **Project skeleton** — Next.js + TypeScript + Tailwind, Supabase connected, deployed to Vercel as an installable PWA (manifest + service worker, "add to home screen" works).
2. **Auth + profile** — sign in, create profile (handle, games played [Gundam/One Piece], approximate location).
3. **Card catalog** — import script to seed the `cards` table from apitcg.com for **both Gundam and One Piece** (tag each row's `game`); build the typeahead search component, scoped per game.
4. **Binder** — add/remove cards (with the search component), set quantity/condition/foil, toggle public/private. *Get your own binder in and make adding cards feel good before anything else.*
5. **Wantlist** — same add flow, simpler.
6. **Matching screen** — run the match query, show "near you have / near you want."
7. **Push notifications** — subscribe flow + server function that fires on a new match. Test on iOS (installed) and Android.
8. **Messaging** — realtime 1:1 chat to arrange trades; suggest a local shop as meetup spot.
9. **Polish + invite** — fix the rough edges, then onboard your first 20–50 players and watch: do binders get built, do matches appear, do trades happen?

*Stop after milestone 9. Don't build anything from the spec's "Out of scope" list until real usage tells you it's the bottleneck.*

---

## Working with your AI coding assistant — tips

- Give it **this doc + the data model** as context up front.
- Work **one milestone per session**; ask it to build, then explain what it built so you can verify.
- When something breaks, paste the **exact error**; web errors are far easier to debug than native ones (a reason the PWA path suits you).
- Commit/deploy after each working milestone so you can always roll back.
- Keep secrets (API keys, VAPID private key) in environment variables, never in code.
