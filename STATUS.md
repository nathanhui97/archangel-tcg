# ArchangelTCG — Project Status

> Keep this file updated as milestones are completed. Read it at the start of every session.

---

## What we're building

A local trading card game app (iOS + Android) where **Gundam Card Game** players list their binder cards and wantlist, then get matched with nearby players to trade in person at a local game shop.

---

## Key decisions (locked in)

- **App name:** "ArchangelTCG" is a placeholder — final name TBD, swap everything during Milestone 9
- **Platform:** iOS + Android from one codebase (Expo / React Native). Mac available for local simulator.
- **Launch game:** Gundam Card Game only. One Piece parked for post-launch.
- **Binders:** Users can create as many named binders as they want, each toggled public or private
- **Matching:** Per-game only. Gundam wantlists match Gundam binders within distance.
- **Trades:** In-person only at launch. Meet at local game shop.
- **New card releases:** Manual seed script (re-run when new Gundam sets drop — uses upsert, safe to re-run)
- **Card data source:** apitcg.com
- **Admin portal:** Not needed for launch — manage via Supabase dashboard directly

---

## Data model (source of truth)

Differs from the original spec doc — use these exact tables:

```
profiles      ( id uuid pk = auth.uid, handle text unique, games text[],
                lat float, lng float, created_at )        -- lat/lng = APPROXIMATE only

cards         ( id text pk, game text, name text, set_name text,
                number text, image_url text )              -- game = 'gundam'; seeded from apitcg.com

binders       ( id uuid pk, user_id uuid fk, name text,
                is_public bool, created_at )               -- users can have many named binders

binder_items  ( id uuid pk, binder_id uuid fk, card_id text fk,
                quantity int, condition text, is_foil bool, photo_url text )

wantlist_items( id uuid pk, user_id uuid fk, card_id text fk )

conversations ( id uuid pk, user_a uuid, user_b uuid, created_at )

messages      ( id uuid pk, conversation_id uuid fk, sender_id uuid,
                body text, created_at )

push_subscriptions ( user_id uuid, subscription jsonb )
```

Matches are **computed by query, never stored.**

---

## Infrastructure

| Service | Detail | Status |
|---|---|---|
| GitHub | github.com/nathanhui97/archangel-tcg | ✅ Live |
| Supabase | xlytsgrrncoxitufmfqj.supabase.co | ✅ Created, .env.local set |
| Vercel | Not yet deployed | ⏳ Pending |

**To deploy Vercel:** go to vercel.com → Add New Project → import `nathanhui97/archangel-tcg` → add these env vars → Deploy:
```
EXPO_PUBLIC_SUPABASE_URL=https://xlytsgrrncoxitufmfqj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ePztR4lcgVj9IzbYMNioHA_UAu9vWY0
```

---

## Tech stack

- **Expo** (React Native) + **Expo Router** — iOS + Android, file-based routing
- **NativeWind** — Tailwind CSS syntax for React Native components
- **Supabase** — auth, Postgres DB, Realtime (chat), Storage (card photos), Row-Level Security
- **EAS Build** — cloud builds for App Store / Play Store submission
- **apitcg.com** — Gundam card catalog API

---

## Milestone progress

| # | Milestone | Status | Notes |
|---|---|---|---|
| 1 | App skeleton | ✅ Done | Expo + NativeWind + Supabase client. Pushed to GitHub. |
| 2 | Auth + profile | ⏳ Next | Sign in, pick handle, set approximate location. Blocked on Vercel deploy. |
| 3 | Card catalog + search | — | Seed script for Gundam cards from apitcg.com. Typeahead search component. |
| 4 | Binder | — | Create named binders, add cards, public/private toggle. |
| 5 | Wantlist | — | Same search-to-add flow, simpler. |
| 6 | Matching screen | — | Query: wantlist ↔ public binder_items, same game, within distance. |
| 7 | Push notifications | — | expo-notifications. Fire when new match appears. |
| 8 | Messaging | — | Supabase Realtime 1:1 chat. Suggest local game shop as meetup. |
| 9 | Polish + launch | — | Swap placeholder name + icons. Onboard first 20–50 players. |

---

## To start a new session

1. Read this file
2. Read `CLAUDE.md` for code conventions
3. Read `doc/ai-agent-knowledge-base.md` for full project rules
4. Check the milestone table above for where to pick up
5. Always build **one milestone at a time**
