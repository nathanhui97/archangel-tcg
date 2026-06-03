# Local TCG Trading App — v1 Product Spec

*Working name: TBD. Format: PWA (installable web app). Stage: pre-launch MVP.*

---

## The one-line version

A local trading-card app where players build a digital **binder** and **wantlist**, then discover and trade with other players nearby — in person or by shipping.

## The core bet (what we do really well)

One thing, done well: **surface local trades that wouldn't otherwise happen.** Everything in v1 serves that. If a player can't add their cards in under a few minutes and immediately see "people near me have what I want," the product has failed — so those two moments are where all the polish goes.

We are deliberately **not** building a social network, a shop platform, a scanner, or a national marketplace in v1. Those are parked on purpose (see *Out of scope*).

## Who it's for at launch

Not "all card collectors everywhere." The launch user is **active local players in your scene, playing Gundam or One Piece.**

- **Two games at launch: Gundam + One Piece.** Gundam is your home scene (your warm start), but its local pools are small, so it may be too thin alone to generate matches. One Piece adds depth: it's the same publisher (Bandai), played at the same shops, with heavy player overlap. Important: these are **two separate matching pools** — a Gundam wantlist matches Gundam binders, not One Piece ones. The second game isn't there to merge with Gundam; it's a second, independent shot at reaching critical mass. Cap it at two — don't sprawl.
- **One locale first.** Your tournament/shop scene. You hand-seed the first 20–50 players. This cohort *is* the validation test.

---

## Core features — v1 (locked)

**1. Lightweight account + profile**
- Sign up (email or social login), pick a handle.
- Set location (for local matching) and which game(s) you play.
- That's it. No bio, no followers, no feed.

**2. Binder (your have-list)** — *make this frictionless; it's make-or-break*
- Add cards fast via **typeahead search** against a card database API — **apitcg.com** covers both Gundam and One Piece in one integration. Type a name, tap to add. No manual data entry of card details.
- Per card: quantity, condition, foil/variant. Optional photo via camera.
- Toggle the binder (or individual cards) **public or private.**

**3. Wantlist (what you're hunting)**
- Same fast search-to-add flow as the binder.
- This is what powers matching — not optional.

**4. Local discovery + matching** — *the magic moment*
- Browse **public binders near you**, filtered by distance and game/set.
- The killer view: **"Players near you have cards on your wantlist"** and **"Players near you want cards in your binder."** Surfacing the match is the whole value — not making people browse manually. Matching happens **within each game**; cross-game value trades (a Gundam card for a One Piece card) just happen freely in chat.
- **Push notification** when a new local match appears ("Someone 8km away just listed a card on your wantlist").

**5. Messaging**
- Simple 1:1 chat to arrange a trade — meet up or ship.
- Suggest **local game shops as meetup spots** (public, trusted, and it keeps trades in the scene you're building).

---

## Out of scope for v1 (parked on purpose)

Keeping these out is the point. Each can come later, in order of when it earns its place:

- **Structured trade offers** (pick cards from each side, propose/accept) — strong *fast-follow* after launch; v1 just uses messaging.
- **Social feed / follow / "see new pulls"** — the community layer, parked.
- **Shop / business accounts** — parked until there's player density worth selling to.
- **Local cash marketplace** (buy/sell with a transaction fee) — this is the eventual *revenue* path; revisit once trading behavior is proven.
- **Card scanning / image recognition** — don't build it; it's solved by others and expensive. Search + optional photo is enough.
- **Ratings/reputation, escrow, shipping/payment integration** — later, once trust at scale matters.
- **Native iOS/Android app** — only when usage proves the camera/push experience is capping growth.
- **More than the two launch games (Gundam + One Piece)** — add a third only after the first two scenes are dense.

---

## Tech approach (brief)

- **PWA**: installable to home screen, full-screen, one codebase, instant updates, no app-store gatekeeping. Uses **camera** (binder photos) and **push notifications** (match alerts).
- **Card data via apitcg.com** (covers Gundam + One Piece) so you never build or maintain a card catalog. (optcgapi.com is a One Piece-specific fallback.)
- Keep the backend light: it mostly stores binders, wantlists, matches, and messages.
- iOS web-push is slightly more finicky than Android — worth testing early, since notifications are the retention engine.

---

## How you'll know it's working (the only metrics that matter at launch)

Don't measure vanity. Watch behavior:

1. **Do people finish a binder?** (If card-adding is too slow, this dies here.)
2. **Do matches appear?** (Enough local density that wantlists hit binders.)
3. **Do conversations turn into real trades?** (The actual goal.)

If 1–3 happen with your first cohort, you have something. If people sign up and never build a binder, the problem is friction, not features.

---

## Open decisions for you

- ~~Which game~~ — **decided: Gundam + One Piece.**
- **Game switching UX** — one combined binder with a game filter, or separate per-game views? (Lean: one binder, filterable.)
- **Ship vs. meet-up** — lead with in-person (your scene's strength) or support both from day one?
- **Structured trade offers** — confident enough to put a simple version in v1, or strictly messaging first?
- **Working name.**

---

## Suggested build order

1. Account + binder (with fast search-to-add). Get *your own* binder in and make adding cards feel good.
2. Wantlist.
3. Local discovery + the wantlist↔binder match view.
4. Push notifications on new matches.
5. Messaging.
6. Invite 20–50 players from your scene. Watch the three signals above.

*Then, and only then, decide what earns its way out of "Out of scope."*
