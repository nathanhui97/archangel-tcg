/**
 * Seed a LIVELY demo: nearby Toronto traders with verified public binders,
 * pulls spread over the last few days, and reactions on everything so the
 * Social tab (Pulls / Nearby Binders / Leaderboard) feels active.
 *
 * Anchors on the real user's profile (location + city).
 *
 *   cd scripts && npx tsx seed-fake-traders.ts          # seed
 *   cd scripts && npx tsx seed-fake-traders.ts --clean  # delete the fakes
 *
 * Idempotent: deleting a fake auth user cascades their binders/pulls/reactions.
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in scripts/.env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const PASSWORD = 'FakeTrader!123Long'
const EMAIL = (handle: string) => `faketrader-${handle}@bindar.test`

// Varied card mixes + spread coords (all within ~7 km, same city).
const TRADERS = [
  { handle: 'cardsbykenji', dlat: 0.01, dlng: 0.01, ship: false, alt: 7, base: 5, pulls: 3 },
  { handle: 'hangar_seven', dlat: -0.02, dlng: 0.03, ship: true, alt: 2, base: 14, pulls: 2 },
  { handle: 'redshift_mika', dlat: 0.03, dlng: -0.02, ship: false, alt: 4, base: 7, pulls: 2 },
  { handle: 'zeon_remnant', dlat: 0.06, dlng: 0.02, ship: false, alt: 5, base: 6, pulls: 2 },
  { handle: 'newtype_ana', dlat: -0.04, dlng: -0.05, ship: true, alt: 3, base: 9, pulls: 3 },
  { handle: 'gunpla_dad', dlat: 0.02, dlng: -0.06, ship: false, alt: 1, base: 11, pulls: 1 },
  { handle: 'char_aznable', dlat: -0.05, dlng: 0.05, ship: false, alt: 6, base: 4, pulls: 3 },
]

const CAPTIONS = [
  'Finally pulled this 🔥', 'Look what I got', 'Insane pull today', 'New chase card ✨',
  'Been hunting this forever', 'Box was worth it', 'One of one vibes', 'Grail acquired',
  'Cracked a fresh box', 'Local shop came through',
]

const round2 = (n: number) => Math.round(n * 100) / 100
const rand = (n: number) => Math.floor(Math.random() * n)
const hoursAgoISO = (maxH: number) => new Date(Date.now() - (rand(maxH) * 3600_000 + 60_000)).toISOString()
function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

async function deleteFake(handle: string) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const u = data?.users.find((x) => x.email === EMAIL(handle))
  if (u) await admin.auth.admin.deleteUser(u.id).catch(() => undefined)
}

async function clean() {
  for (const t of TRADERS) await deleteFake(t.handle)
  console.log('✓ Removed fake traders.')
}

async function seed() {
  const now = new Date().toISOString()
  const fakeHandles = new Set(TRADERS.map((t) => t.handle))

  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, handle, lat, lng, city, created_at')
    .not('lat', 'is', null)
    .order('created_at', { ascending: true })
  if (pErr) {
    console.error('✗ Could not read profiles:', pErr.message)
    process.exit(1)
  }
  const anchor = (profiles ?? []).find((p) => !fakeHandles.has(p.handle))
  if (!anchor) {
    console.error('✗ No real user profile with a location found. Set your location in the app first.')
    process.exit(1)
  }
  console.log(`Anchor: @${anchor.handle} (${anchor.lat}, ${anchor.lng}) city=${anchor.city ?? '(none)'}`)
  if (!anchor.city) console.warn("⚠ No city on your profile → fakes won't show on the leaderboard.")

  const { data: altRows } = await admin
    .from('cards').select('id').eq('game', 'gundam').eq('is_alt_art', true)
    .order('rarity_rank', { ascending: false }).limit(60)
  const { data: baseRows } = await admin
    .from('cards').select('id').eq('game', 'gundam').eq('is_alt_art', false).eq('set_code', 'GD01')
    .order('number', { ascending: true }).limit(90)
  const altIds = (altRows ?? []).map((c) => c.id)
  const baseIds = (baseRows ?? []).map((c) => c.id)
  if (altIds.length < 28 || baseIds.length < 56) {
    console.error(`✗ Not enough cards (alt=${altIds.length}, base=${baseIds.length}).`)
    process.exit(1)
  }

  const fakeUids: string[] = []
  const allPulls: { id: string; uid: string }[] = []
  let altOff = 0
  let baseOff = 0
  let capIdx = 0

  for (const t of TRADERS) {
    await deleteFake(t.handle)

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: EMAIL(t.handle), password: PASSWORD, email_confirm: true,
    })
    if (cErr || !created?.user) {
      console.error(`✗ createUser ${t.handle}:`, cErr?.message)
      continue
    }
    const uid = created.user.id
    fakeUids.push(uid)
    const lat = round2(anchor.lat + t.dlat)
    const lng = round2(anchor.lng + t.dlng)

    const { error: profErr } = await admin.from('profiles').insert({
      id: uid, handle: t.handle, games: ['gundam'], lat, lng,
      city: anchor.city ?? null, willing_to_ship: t.ship, verified_at: now,
    })
    if (profErr) {
      console.error(`✗ profile ${t.handle}:`, profErr.message)
      continue
    }

    const { data: binder } = await admin
      .from('binders')
      .insert({ user_id: uid, name: `${t.handle}'s Collection`, is_public: true, binder_type: 'trade', verified_at: now })
      .select().single()
    if (!binder) continue

    const myAlts = altIds.slice(altOff, altOff + t.alt)
    const myBase = baseIds.slice(baseOff, baseOff + t.base)
    altOff += t.alt
    baseOff += t.base
    const offer = [...myAlts, ...myBase]
    for (let j = 0; j < offer.length; j++) {
      await admin.from('binder_items').insert({
        binder_id: binder.id, card_id: offer[j], quantity: 1 + (j % 3),
        condition: (['NM', 'LP', 'MP'] as const)[j % 3], is_foil: false,
      }).then(undefined, () => {})
    }
    for (const cid of baseIds.slice(60, 64)) {
      await admin.from('wantlist_items').insert({ user_id: uid, card_id: cid }).then(undefined, () => {})
    }

    for (let k = 0; k < t.pulls && k < myAlts.length; k++) {
      const { data: pull } = await admin.from('pulls').insert({
        user_id: uid, card_id: myAlts[k], is_pull: true, visibility: 'public',
        caption: CAPTIONS[capIdx++ % CAPTIONS.length], verified_at: now, created_at: hoursAgoISO(120),
      }).select('id').single()
      if (pull) allPulls.push({ id: pull.id, uid })
    }

    console.log(`✓ @${t.handle} — ${offer.length} cards, ${t.pulls} pull(s)${t.ship ? ' · ships' : ''}`)
  }

  // Include the real user's own pulls as reaction targets, too.
  const { data: anchorPulls } = await admin.from('pulls').select('id').eq('user_id', anchor.id)
  for (const p of anchorPulls ?? []) allPulls.push({ id: p.id, uid: anchor.id })

  // Reactions: each pull gets 2–6 reactors (fake traders), mixed kinds → lively counts.
  let reactionCount = 0
  for (const pull of allPulls) {
    const reactors = shuffle(fakeUids.filter((u) => u !== pull.uid)).slice(0, 2 + rand(5))
    for (const ru of reactors) {
      const kinds: string[] = ['fire']
      if (Math.random() < 0.5) kinds.push('heart')
      if (Math.random() < 0.35) kinds.push('want')
      for (const kind of kinds) {
        const { error } = await admin
          .from('pull_reactions')
          .insert({ pull_id: pull.id, user_id: ru, kind, created_at: hoursAgoISO(100) })
        if (!error) reactionCount++
      }
    }
  }

  console.log(`\n✓ Done. ${fakeUids.length} traders · ${allPulls.length} pulls · ${reactionCount} reactions.`)
  console.log('  Reload the Social tab — it should feel alive now.')
}

const run = process.argv.includes('--clean') ? clean : seed
run().catch((e) => {
  console.error('✗ FATAL:', e)
  process.exit(1)
})
