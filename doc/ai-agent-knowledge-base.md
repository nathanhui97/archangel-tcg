# AI Coding Agent — Project Knowledge Base & Rules

> Drop-in context for the AI agent building this app. Rename to `CLAUDE.md` (Claude Code), `AGENTS.md`, or `.cursorrules` (Cursor), or paste as project context. Read this in full before any task. Keep it updated as the source of truth.

---

## What you are building

A **local trading-card PWA**. Players build a digital **binder** (cards they own) and a **wantlist** (cards they seek), then discover nearby players whose binders match their wantlist and message them to trade. The core value is **surfacing local trade matches** — not browsing, not social feeds. Optimize every decision for: *can a player add cards fast, and instantly see who nearby has what they want?*

**Launch games: Gundam Card Game and One Piece Card Game (exactly these two).** A binder/wantlist can span both games, but **matching is per-game** — a Gundam wantlist matches Gundam binders only. Cross-game value trades happen freely in chat, not via the match engine.

---

## Golden rules (follow these on every task)

1. **One milestone at a time.** Build the requested milestone only. Do not scaffold future features. Do not touch anything on the "Do NOT build" list.
2. **Ask before large or destructive changes.** Confirm before schema migrations, deleting code, or changing the stack.
3. **Explain what you built** after each task so it can be verified by a non-expert.
4. **Test with real data before declaring done.** Assume the user will run it on a phone.
5. **Keep it simple.** Prefer the boring, well-supported solution over the clever one. This is a solo, AI-built project — readability beats sophistication.
6. **Secrets live in environment variables**, never in code or the repo.
7. **Never use the chosen stack's alternatives** without asking (no swapping Supabase for Firebase, etc.).

---

## Tech stack (use exactly these)

- **Next.js (App Router) + TypeScript** — UI and lightweight API routes.
- **Supabase** — auth, Postgres database, realtime (chat), storage (photos), row-level security.
- **Tailwind CSS** — styling.
- **Vercel** — hosting / deploys.
- **Card data:** apitcg.com — covers both Gundam and One Piece in one integration. (optcgapi.com = One Piece-only fallback.)
- **Web Push** (VAPID) for notifications.

Do not introduce new dependencies without a clear reason and approval.

---

## Project conventions

- **TypeScript everywhere**; no `any` unless unavoidable.
- **Folder structure:** `app/` routes, `components/` UI, `lib/` (Supabase client, helpers), `types/` shared types.
- **Components:** small, focused, named clearly (`BinderCardRow`, `MatchList`).
- **Database access** via the Supabase client; rely on Row-Level Security, not client-side checks, for data protection.
- **Mobile-first** layouts always — this is used on phones.
- **No personal data in URLs** (no location, no IDs that expose private info).

---

## Data model (single source of truth — use these exact tables/fields)

```
profiles      ( id uuid pk = auth.uid, handle text unique, games text[],
                lat float, lng float, created_at )      -- lat/lng = APPROXIMATE only; games = gundam and/or one_piece
cards         ( id text pk, game text, name text, set_name text,
                number text, image_url text )            -- game = 'gundam' | 'one_piece'; seeded from apitcg.com
binder_items  ( id uuid pk, user_id uuid fk, card_id text fk, quantity int,
                condition text, is_foil bool, is_public bool, photo_url text )
wantlist_items( id uuid pk, user_id uuid fk, card_id text fk )
conversations ( id uuid pk, user_a uuid, user_b uuid, created_at )
messages      ( id uuid pk, conversation_id uuid fk, sender_id uuid,
                body text, created_at )
push_subscriptions ( user_id uuid, subscription jsonb )
```

Matches are **computed by query, never stored as a table.**

---

## Domain knowledge (so you don't guess)

- **TCG** = Trading Card Game. The two launch games are the **Gundam Card Game** and the **One Piece Card Game**, both published by Bandai.
- **Binder** = the cards a player owns and may trade. **Wantlist** = cards they're looking for.
- **Condition codes** (standard): `NM` Near Mint, `LP` Lightly Played, `MP` Moderately Played, `HP` Heavily Played, `DMG` Damaged. Store one of these in `binder_items.condition`.
- **Foil** = a premium finish; a different item/value from the non-foil — track with `is_foil`.
- **Set / number** identify a specific printing of a card; the same card name can exist in many sets. One Piece card numbers look like `OP05-115`, `ST03-008`; Gundam sets use codes like `GD01`, `ST08`.
- **Card data source:** **apitcg.com** exposes both Gundam and One Piece (plus Pokémon, Magic, Digimon, Dragon Ball). Use it to seed the `cards` table per game, tagging each row's `game`. Card **images are Bandai's copyright** — display via the API/official source; never relicense or claim them.
- **A "match"** = another user, within distance, whose **public** `binder_items` contain a `card_id` on the current user's `wantlist_items`, **in the same game** (and the reverse direction).

---

## Critical implementation rules (the gotchas)

**Card search**
- Seed both games' full catalogs (Gundam + One Piece) into the `cards` table once from apitcg.com, tagging each row's `game`. Never call the card API live on each keystroke.
- Typeahead searches the local `cards` table (Postgres `ilike`/full-text), **scoped to the current game**, debounced. This flow must feel instant — it's the make-or-break UX.

**Location & privacy**
- Store **approximate** location only (snap to a coarse grid or area). **Never** store or expose exact GPS coordinates or addresses.
- Compute "within X km" with haversine or PostGIS. Never expose another user's raw coordinates to the client.

**Matching**
- Implement as a query joining the current user's `wantlist_items` against other users' **public** `binder_items`, **filtered to the same `cards.game`** and within distance. Surface counts: "N players near you have cards on your wantlist" and the reverse.

**Security**
- Enable **Row-Level Security** on all tables. Users may read their own rows and only `is_public = true` binder items of others. Private binders must never reach the client.

**PWA**
- Include a valid `manifest.json` (standalone display, 192/512 icons) and a service worker (cache app shell + handle push). Provide an "Add to Home Screen" prompt.

**Push notifications**
- Use VAPID keys (private key in env). Subscribe on the client, store in `push_subscriptions`, send from a server function when a **new** match appears.
- **iOS:** web push only works when the PWA is installed to the home screen (iOS 16.4+). Detect iOS and prompt installation.

**Camera**
- Card photos via `<input type="file" accept="image/*" capture="environment">`, uploaded to Supabase Storage. Do not build card scanning/recognition.

---

## Do NOT build (out of scope for v1)

Building any of these without explicit instruction is a mistake:

- Social feed, follow/subscribe, "see new pulls."
- Shop / business accounts.
- Cash marketplace, payments, escrow, checkout.
- Card scanning / image recognition.
- Ratings, reputation, reviews.
- Native iOS/Android app.
- More than the two launch games (Gundam + One Piece).
- Shipping/label integrations.

If a task seems to require one of these, **stop and ask.**

---

## Definition of done (every task)

- Works on a mobile screen.
- Respects Row-Level Security; no private data leaks to the client.
- No secrets in code or repo.
- Tested with at least one real record end-to-end.
- Deploys cleanly to Vercel.
- A one-paragraph explanation of what changed, for non-expert verification.

---

## Build order (milestones — do in sequence)

1. PWA skeleton (Next.js + Tailwind + Supabase + manifest/service worker, installable, deployed).
2. Auth + profile (handle, games played [Gundam/One Piece], approximate location).
3. Seed `cards` catalog from apitcg.com for **both games** + per-game typeahead search component.
4. Binder (add via search; quantity/condition/foil; public/private toggle).
5. Wantlist.
6. Matching screen (the match query + counts).
7. Push notifications (subscribe + fire on new match; test iOS installed).
8. Messaging (Supabase realtime 1:1 chat; suggest a local shop as meetup spot).
9. Polish, then onboard the first players.

Stop at milestone 9.
