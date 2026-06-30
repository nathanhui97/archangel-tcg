# Social Sign-In Setup (Google + Apple)

Native Sign in with Apple + Google, wired to Supabase via `signInWithIdToken`.
The **app code is already done** — this doc is the external config you (the human)
must do, because it needs accounts, client IDs, and provider toggles I can't touch.

> **Reality check on accounts:**
> - **Google sign-in is FREE** — it only needs a free **Google Cloud** project. The
>   $25 Google Play Developer account is for *publishing*, not sign-in.
> - **Apple sign-in REQUIRES the $99/yr Apple Developer Program** — no free path. You
>   also need it for the iOS dev build + App Store, so start enrollment now (1–3 days).
> - **Neither works in Expo Go.** You need a **dev build**. The login screen hides the
>   social buttons in Expo Go on purpose.

---

## Part A — Google (do this first; no paid account needed)

### A1. Create a Google Cloud project
1. https://console.cloud.google.com → create project **"Bindar"**.

### A2. OAuth consent screen
1. **APIs & Services → OAuth consent screen** → User type **External** → Create.
2. App name **Bindar**, your support email, developer email. Save.
3. Scopes: add `.../auth/userinfo.email` and `.../auth/userinfo.profile`. Save.
4. While in **Testing**, add your own Google account under **Test users** (otherwise
   sign-in is blocked until you publish the consent screen).

### A3. Create THREE OAuth client IDs
**APIs & Services → Credentials → Create Credentials → OAuth client ID**, three times:

| Type | Settings | Where it goes |
|---|---|---|
| **Web application** | name "Bindar Web" | → **Supabase** (Client ID + Secret) and → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| **iOS** | Bundle ID `com.bindar.app` | → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + the URL scheme (A4) |
| **Android** | Package `com.bindar.app` + **SHA‑1** (see A5) | no env var — Google matches by package+SHA1 |

> The **Web** client ID is the token *audience* and is used on BOTH platforms. The iOS
> client ID drives the native iOS dialog. Android needs its own client for the SHA‑1
> match but you don't reference it in code.

### A4. Set the iOS URL scheme
Take the **iOS client ID**, e.g. `123456-abcDEF.apps.googleusercontent.com`, and
**reverse** it to `com.googleusercontent.apps.123456-abcDEF`. Put it in `app.json`:

```jsonc
[
  "@react-native-google-signin/google-signin",
  { "iosUrlScheme": "com.googleusercontent.apps.123456-abcDEF" }  // <-- replace placeholder
]
```

### A5. Get the Android SHA‑1
The dev build is signed by an EAS-managed keystore. After you run the first Android
dev build (Part D), get its SHA‑1 with:

```bash
eas credentials   # → Android → your profile → shows SHA‑1 fingerprint
```

Paste that SHA‑1 into the **Android** OAuth client in Google Cloud. (Each keystore —
dev vs production — has a different SHA‑1, so you'll add the production one later too.)

### A6. Enable Google in Supabase
**Supabase dashboard → Authentication → Providers → Google → Enable**:
- **Client ID** + **Client Secret** = from the **Web** client (A3).
- **Authorized Client IDs** (comma-separated) = your **Web**, **iOS**, and **Android**
  client IDs. This is what lets Supabase accept the native ID tokens.
- Save.

---

## Part B — Apple (needs the $99 Apple Developer Program)

### B1. Enroll
https://developer.apple.com/programs/ — $99/yr, 1–3 days to verify. Needed anyway for
the iOS build + App Store.

### B2. Enable the capability on your App ID
**Apple Developer → Certificates, IDs & Profiles → Identifiers → `com.bindar.app`** →
check **Sign in with Apple** → Save.
(`app.json` already sets `ios.usesAppleSignIn: true`, so EAS adds the entitlement.)

### B3. Enable Apple in Supabase
**Supabase → Authentication → Providers → Apple → Enable**. For the **native iOS**
flow this is all you need:
- **Authorized Client IDs** = `com.bindar.app` (your bundle ID).
- You can leave the Services ID / Secret Key blank — those are only for the *web*
  OAuth redirect flow, which we don't use on native.
- Save.

---

## Part C — Local env
Copy the client IDs into `.env.local` (see `.env.local.example`):

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...apps.googleusercontent.com
```

(Apple needs no client ID in the app — it uses the bundle ID.)

---

## Part D — Build & test (Expo Go can't run this)

```bash
# Android — testable as soon as Part A is done (no Apple account needed)
eas build --profile development --platform android
#   → install the build, then `npx expo start --dev-client`, open the app, tap "Continue with Google"

# iOS — needs Part B done (Apple Dev account)
eas build --profile development --platform ios
```

### Test checklist
- [ ] Google on Android: tap → Google sheet → returns to app → lands on profile-setup (new user) or home (returning).
- [ ] Google on iOS: same.
- [ ] Apple on iOS: the black "Sign in with Apple" button appears → Face/Touch ID → returns signed in.
- [ ] A brand-new social user is routed to **profile-setup** (handle + location) — verify the existing AuthGate flow.
- [ ] Sign out, sign back in with the same provider → no duplicate account, goes straight home.

---

## How it works in code (for reference)
- `lib/social-auth.ts` — `signInWithGoogle()` / `signInWithApple()` get a provider ID
  token and call `supabase.auth.signInWithIdToken({ provider, token })`. Guarded so
  Expo Go never loads the native Google module.
- `app/(auth)/login.tsx` — renders the native Apple button (iOS, when available) and a
  Google button; both hidden in Expo Go (`isExpoGo`).
- No new app screens or backend changes: a fresh OAuth user has a session but no
  `profiles` row, so the existing `AuthGate` (`app/_layout.tsx`) sends them to
  `profile-setup` automatically — same path as email signups.

## Gotchas
- **Consent screen in Testing** blocks non-test-user Google accounts — add testers or publish it.
- **SHA‑1 mismatch** is the #1 Android failure (`DEVELOPER_ERROR`) — the build's keystore SHA‑1 must be in the Android OAuth client.
- **App Store rule 4.8:** if you offer Google sign-in on iOS you must also offer Apple — that's why we ship both.
- **`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in production builds.** Dev builds read `.env.local` from your local Metro server, so the client ID is present when testing. But a **production/preview** build bundles JS in the cloud where `.env.local` doesn't exist → the ID comes out `undefined` and Google sign-in fails silently. Register it as an EAS env var before a store build:
  ```
  eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <web-client-id> --environment production --visibility plaintext
  ```
  (Do the same for the Supabase URL/anon key and, later, the iOS client ID.)
