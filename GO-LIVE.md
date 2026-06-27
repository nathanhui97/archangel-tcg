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
- [x] **[both]** **Privacy Policy** — drafted at `landing/privacy.html` (real data practices). ⚠️ set the real support email + deploy.
- [x] **[both]** **Terms of Service** — drafted at `landing/terms.html` (in-person-risk + no-payments + Bandai non-affiliation). ⚠️ confirm governing-law jurisdiction (defaulted to Ontario, CA) + deploy.
- [ ] **[you]** Decide **affiliation/IP framing** (see Risks): add a "Not affiliated with / endorsed by Bandai" disclaimer; keep their marks out of your icon + listing.
- [ ] **[you]** Support contact (email or page) for the store listings.

---

## Phase 2 — Production hardening  (mostly code)

- [x] **[code]** **Account deletion flow** — done + verified (migration 0019 `delete_my_account()`; Profile → Delete account; cascade wipe confirmed).
- [x] **[code]** **Real app icon + splash** — done from the brand kit (`scripts/gen-icons.mjs`): full radar icon, padded Android adaptive foreground, mark splash.
- [x] **[code]** **iOS permission strings** — done in `app.json` (location/camera/photos via plugins; notif icon = mark; `ITSAppUsesNonExemptEncryption=false`).
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

## Progress (2026-06-26)

**Done:** account deletion (verified), app icon + adaptive icon + splash, iOS permission strings, privacy + terms drafts, `eas.json` profiles, dev-build deps (keyboard-controller + expo-dev-client), backend security smoke test (22/22).

**Your turn (external / can't be coded):**
1. Create **Apple Developer** ($99) + **Google Play** ($25) accounts — slowest, start now.
2. **Rotate the Supabase service-role key** (dashboard) → update `scripts/.env` only.
3. `eas init` + **dev build** → verify keyboard + push + device QA.
4. Set the real **support email** in `landing/privacy.html` / `terms.html` and **deploy the landing site**.

**Still code (when you're ready):** push credentials (during build), prod-config check, optional Sentry, nearby-match radar push, onboarding nudge.
