# Bindar — Go-Live Plan

> Living checklist to get Bindar onto the **App Store** and **Google Play**.
> Last updated: 2026-06-26.
> Legend: **[you]** = needs an account / payment / decision / asset · **[code]** = I can do it in the repo · **[both]** = collaboration.

---

## TL;DR

The engineering is largely done and **provably solid** (backend: 26/26 + 22/22 smoke tests incl. cross-user leak prevention). What's left to launch is mostly **accounts, legal/policy, store assets, and review cycles** — not features. Most of the calendar time is *waiting* (account verification, Google's mandatory test window, app review), so start the slow external items first.

**Realistic timeline:** ~3–6 weeks elapsed; ~3–5 focused engineering days.
**Cost:** Apple $99/yr + Google $25 one-time (+ optional domain/email already covered).

---

## Current state (2026-06-26)

**Done & verified**
- Milestones 1–6 + 8: auth, profile, card catalog + search, binders (overhauled), wantlist, matching, trades/messaging/proposals/inquiries.
- Backend: `npm run smoke-test` (26/26) and `npm run smoke-test-trades` (22/22, incl. RLS leak + impersonation).
- Core loop verified on-device: request → propose → accept → chat.
- Supabase migrations applied through **0018**.

**Pending**
- Native dev build (keyboard fix + push delivery) — **the immediate next step**.
- On-device QA of the native bits (keyboard, push, camera, location).
- Everything in Phases 1–5 below.

---

## Phase 0 — Dev build & on-device verification  ⏳ NEXT

- [ ] **[you]** `eas init` (creates the Expo project ID, links your Expo account).
- [ ] **[you]** `eas build --profile development --platform android` → install the APK.
- [ ] **[you]** `npx expo start` → open your dev app → walk the **Device QA checklist** (below).
- [ ] **[both]** Fix anything QA surfaces.

**Device QA checklist**
- [ ] Auth: OTP login, profile setup, sign out
- [ ] Binders: create / add (qty) / drag-reorder / hold-to-delete / cover / rename / public-private / delete
- [ ] Duplicates show as separate tiles; rarity rows render
- [ ] Wantlist add/remove
- [ ] Browse → Request a card → chat opens with card bubble
- [ ] Propose (give/get + cash) → proposal card → Accept/Decline
- [ ] Inbox unread dots + pending badge; 3-per-card request cap
- [ ] **Keyboard** sits above composer (dev build only)
- [ ] **Push** arrives + deep-links to the chat (background app, run `fake-trader-reply.ts`)
- [ ] Camera (binder photo) + location permission prompts read correctly

---

## Phase 1 — Accounts, legal & policy  (start NOW — slowest items)

- [ ] **[you]** **Apple Developer Program** — $99/yr, identity verification 1–3 days.
- [ ] **[you]** **Google Play Developer** — $25 one-time. ⚠️ New personal accounts must run a **closed test with ≥12 testers for 14 days** before production. Start this track EARLY.
- [ ] **[both]** **Privacy Policy** (required by both stores) — discloses email, approximate location, messages, photos. Host on the landing site. *(code can draft + publish the page.)*
- [ ] **[both]** **Terms of Service** — host alongside the policy.
- [ ] **[you]** Decide **affiliation/IP framing** (see Risks): add a "Not affiliated with / endorsed by Bandai" disclaimer; keep their marks out of your icon + listing.
- [ ] **[you]** Support contact (email or page) for the store listings.

---

## Phase 2 — Production hardening  (mostly code)

- [ ] **[code]** **Account deletion flow** — Apple *requires* in-app deletion when you have sign-up. Profile → delete account → RLS-safe wipe (cascades binders/trades/messages).
- [ ] **[code]** **Real app icon + splash** — replace placeholders (mark = `RadarLogo`). iOS icon + Android adaptive icon + splash. *(you approve the art.)*
- [ ] **[code]** **iOS permission strings** (Info.plist via Expo plugins): location, notifications, camera, photo library — clear "why" text.
- [ ] **[you/code]** **Push credentials**: APNs key (iOS) + FCM v1 (Android). EAS manages these during build; you grant access.
- [ ] **[you]** **Rotate the Supabase `service_role` key** — it appeared in early chat (see HANDOFF). Regenerate in dashboard; update `scripts/.env` only.
- [ ] **[code]** Confirm **prod env config** (EXPO_PUBLIC_ keys correct; nothing secret bundled).
- [ ] **[code]** Remove debug band-aids (`polyfills.js`/`index.js` if unused) and flip `newArchEnabled` review.
- [ ] **[code]** (Optional) Sentry crash reporting; EAS Update for OTA JS patches.
- [ ] **[code]** Pre-release gate: run both smoke tests + `tsc --noEmit` green.

---

## Phase 3 — Store listings & assets

- [ ] **[you]** App name (Bindar), subtitle, **description**, keywords, **category** (e.g. Lifestyle / Utilities).
- [ ] **[you]** **Screenshots** at required device sizes (iPhone 6.7"/6.5", Android phone). Capture from the dev build.
- [ ] **[you]** **Content rating** — IARC questionnaire (Google) + age rating (Apple). Note: user-to-user messaging affects this.
- [ ] **[you]** **Data Safety form** (Google) + **App Privacy "nutrition label"** (Apple) — declare: email, approximate location, messages/photos, no selling of data.
- [ ] **[you]** App Store: privacy policy URL, support URL, marketing URL (optional).

---

## Phase 4 — Beta testing

- [ ] **[you]** iOS **TestFlight**: internal testers first, then external.
- [ ] **[you]** Android **Internal testing** → **Closed testing** (the required 12-tester / 14-day window) → ready for production.
- [ ] **[both]** Recruit 10–20 real local players — doubles as first user acquisition.
- [ ] **[both]** Triage feedback; fix blockers; ship via EAS Update where possible.

---

## Phase 5 — Submit & launch

- [ ] **[you]** `eas build --profile production --platform android` (AAB) and `--platform ios` (IPA).
- [ ] **[you]** `eas submit` → App Store Connect + Play Console.
- [ ] **[you]** Submit for review (Apple ~1–3 days, Google ~1–3 days; longer for new accounts).
- [ ] **[both]** Respond to review feedback; resubmit if needed.
- [ ] **[you]** Set release (phased rollout recommended on Google).

---

## Phase 6 — Post-launch

- [ ] Monitor crashes / push delivery / Supabase usage + RLS.
- [ ] **Nearby-match radar push** ("someone near you wants your card") — deferred feature; build post-launch.
- [ ] **Onboarding nudge** — guide new users to make their first trade binder.
- [ ] OTA JS updates via EAS Update; native version bumps via new builds.
- [ ] Iterate from beta feedback; plan One Piece game (parked).

---

## Risks & gotchas (read before spending money)

1. **IP / copyright (highest review risk).** Card images, names, and set logos are Bandai's. Apple (4.1 copycats / 5.2 IP) and Google can reject. Mitigate: serve images from the official source, add a clear non-affiliation disclaimer, keep Bandai marks out of *your* icon and listing, don't imply endorsement. Have a fallback plan if rejected.
2. **Google's 14-day closed test** is mandatory for new personal accounts → start it the day the account is approved, or it gates everything.
3. **Account deletion** is a hard Apple requirement — must ship before submission.
4. **Push only works on a real build** (not Expo Go) and needs APNs/FCM credentials.
5. **Service-role key rotation** — do it before launch; it was exposed early.
6. **Location privacy** — already rounded to ~1.1 km; keep raw coords server-side (already the case).

---

## Cost summary

| Item | Cost |
|---|---|
| Apple Developer Program | $99 / year |
| Google Play Developer | $25 one-time |
| EAS Build | Free tier works to start (paid for more concurrency) |
| Supabase | Free tier to start |
| Domain / landing | already covered |

---

## What I (code) can start now without the dev build

1. **Account-deletion flow** (Apple blocker) — highest priority.
2. **App icon + splash** pipeline in `app.json` (from `RadarLogo`).
3. **iOS permission strings** + finalize `eas.json` production profile.
4. **Privacy policy + terms** pages on the landing site.
5. This doc stays the source of truth — tick items as we go.
