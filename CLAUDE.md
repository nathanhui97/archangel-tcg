# ArchangelTCG — Agent Context

Three companion files, read them in this order at session start:
1. `STATUS.md` — current milestone state, what's done, what's next
2. `PLAYBOOK.md` — how to do common operational tasks (scrape, test, debug, run app)
3. `doc/ai-agent-knowledge-base.md` — full project rules and conventions

## Quick reference

- **Stack:** Expo (React Native) + Expo Router + TypeScript + NativeWind (Tailwind) + Supabase + EAS Build
- **Platform:** iOS + Android (both from one codebase)
- **Games:** Gundam Card Game only (v1 launch). One Piece parked for later.
- **Card data:** apitcg.com (Gundam). Images are Bandai copyright — display via API source.
- **Folder layout:** `app/` routes (Expo Router) · `components/` UI · `lib/` helpers · `types/` shared types · `assets/` images

## Key Expo conventions

- Env vars use `EXPO_PUBLIC_` prefix (not `NEXT_PUBLIC_`)
- Supabase client is at `lib/supabase.ts` (single export, uses AsyncStorage)
- Styling via NativeWind — use `className` on RN components (`View`, `Text`, `Pressable`, etc.)
- Push notifications via `expo-notifications` (no VAPID needed)
- Camera via `expo-image-picker`
- Location via `expo-location`

## Data model delta (differs from original spec)

The original spec had `binder_items.user_id`. This project uses **named binders**:

```
binders      ( id uuid pk, user_id uuid fk, name text, is_public bool, created_at )
binder_items ( id uuid pk, binder_id uuid fk, card_id text fk,
               quantity int, condition text, is_foil bool, photo_url text )
```

- `is_public` is a **binder-level** toggle (whole binder is public or private).
- Users can create as many binders as they want with any name.
- Matching queries join through `binders` (where `is_public = true`) → `binder_items` → `cards`.

## Milestones

1. ✅ App skeleton (Expo + NativeWind + Supabase client, runs on simulator)
2. Auth + profile
3. Card catalog seed (apitcg.com Gundam) + typeahead search
4. Binder (create/name, add cards, public/private toggle)
5. Wantlist
6. Matching screen (per-game query, distance-filtered)
7. Push notifications (expo-notifications)
8. Messaging (Supabase Realtime 1:1 chat)
9. Polish + launch (swap placeholder app name, real icons)
