# Bindar — beta landing page

Standalone static marketing + waitlist page (phosphor-green theme, matches
`Bindar Landing.dc.html`). Collects beta signups + a short survey into Supabase
and shows a real waitlist position and referral link.

It is **independent of the Expo app** — no build step, just static files.

## Files

```
landing/
  index.html          # the page (ported 1:1 from the design)
  app.js              # waitlist state machine (form → survey → done) + Supabase calls
  config.js           # Supabase URL + publishable key (public-safe; see note)
  assets/cards/*.webp # card art used in the phone mockups
```

## One-time backend setup

1. Open the Supabase **SQL Editor** for the project and run, in order:
   [`../supabase/migrations/0009_waitlist.sql`](../supabase/migrations/0009_waitlist.sql)
   then [`../supabase/migrations/0010_waitlist_survey_fields.sql`](../supabase/migrations/0010_waitlist_survey_fields.sql).
   Together they create the `waitlist` table (RLS on, no direct access) plus two
   `SECURITY DEFINER` RPCs:
   - `join_waitlist(p_email, p_city, p_referred_by)` → returns `{ position, referral_code }`
   - `submit_waitlist_survey(p_email, p_games, p_trade_how, p_want_reason, p_lgs, p_trade_freq, p_roles)`
2. `config.js` already points at the project with the **publishable** key.
   This key is meant to ship in client code — the email list is never readable
   with it (RLS denies direct reads; only the RPCs run, as the table owner).

## Run locally

```bash
npx serve landing      # then open the printed http://localhost:3000
# or: python3 -m http.server -d landing 3000
```

> Open it over `http://`, not `file://` — `app.js` is an ES module and uses
> `fetch`, which browsers block on the `file:` protocol.

## Deploy (free static hosting)

Any static host works. Point the project/root at the `landing/` folder:

- **Vercel** — `vercel deploy` (set root directory to `landing`), or import the
  repo and set the output/root dir to `landing`.
- **Netlify** — drag-and-drop the `landing/` folder, or set publish directory to `landing`.
- **Cloudflare Pages / GitHub Pages** — serve `landing/` as the site root.

No build command is needed.

## What gets captured

| Field | Where | Why |
|---|---|---|
| `email` | form step | the lead |
| `city` | form step | **launch-metro signal** — which area can first reach trade liquidity |
| `games` | survey | what to support / prioritize |
| `trade_freq` | survey | engagement intensity — weekly traders create liquidity |
| `roles` | survey | seed nodes — store owners / organizers bootstrap an area |
| `lgs` | survey | the local shop / play space — anchor launch + spot clusters |
| `trade_how` | survey | current behavior (LGS / FB / Discord / marketplaces / none) |
| `want_reason` | survey | the hook that converts |
| `referral_code` / `referred_by` | auto | invite loop — recruit local players to bump an area up |

Position is seeded so the first real signup shows as **#412** (tweak `v_seed`
in the migration).

## Verify the flow

1. `npx serve landing`, open the page.
2. Enter an email + city → **Sign up for beta** → survey shows `You're on the
   list — #<n>` with a real number from `join_waitlist`.
3. Pick chips (games = multi-select, the other two single) → **Submit answers**
   → done screen shows `TRADER #<n>` + a working **Copy** / **Share** invite link.
4. Open `…/?i=<code>` and sign up with another email → that row's `referred_by`
   is set to `<code>`.
5. In Supabase, confirm the `waitlist` row; confirm a direct
   `select * from waitlist` with the anon key returns **nothing** (RLS), while
   the RPCs work.
