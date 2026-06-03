# ArchangelTCG — Agent Context

Full knowledge base: `doc/ai-agent-knowledge-base.md` — read it before every task.

## Quick reference

- **Stack:** Next.js 15 App Router + TypeScript + Tailwind CSS + Supabase + Vercel
- **Games:** Gundam Card Game + One Piece Card Game. Matching is per-game only.
- **Card data:** apitcg.com (covers both games). Images are Bandai copyright — display via API source.
- **Folder layout:** `app/` routes · `components/` UI · `lib/` helpers · `types/` shared types · `public/` static

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

1. ✅ PWA skeleton (manifest + service worker, installable)
2. Auth + profile
3. Card catalog seed (both games via apitcg.com) + per-game typeahead search
4. Binder (create/name, add cards, public/private toggle)
5. Wantlist
6. Matching screen (per-game query, distance-filtered)
7. Push notifications (VAPID, iOS install prompt)
8. Messaging (Supabase Realtime 1:1 chat)
9. Polish + launch
