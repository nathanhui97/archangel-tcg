/**
 * Seed a few fake nearby traders so Browse / Wanted / Matches have data.
 *
 * Anchors on the real user's profile location, then creates 3 traders within a
 * few km, each with a public trade binder (real GD01 cards) + a wantlist.
 *
 *   cd scripts && npx tsx seed-fake-traders.ts          # seed
 *   cd scripts && npx tsx seed-fake-traders.ts --clean  # delete the fakes
 *
 * Idempotent: re-running re-creates the same three traders.
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

const TRADERS = [
  { handle: 'cardsbykenji', dlat: 0.02, dlng: 0.01, ship: false },
  { handle: 'hangar_seven', dlat: -0.03, dlng: 0.04, ship: true },
  { handle: 'redshift_mika', dlat: 0.05, dlng: -0.02, ship: false },
]

const round2 = (n: number) => Math.round(n * 100) / 100

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
  // 1. Anchor on the real user's location (oldest profile that isn't one of our fakes).
  const fakeHandles = new Set(TRADERS.map((t) => t.handle))
  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, handle, lat, lng, created_at')
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
  console.log(`Anchor: @${anchor.handle} (${anchor.lat}, ${anchor.lng})`)

  // 2. Pull real GD01 cards to distribute.
  const { data: cards } = await admin
    .from('cards')
    .select('id')
    .eq('game', 'gundam')
    .eq('set_code', 'GD01')
    .order('number', { ascending: true })
    .limit(40)
  const cardIds = (cards ?? []).map((c) => c.id)
  if (cardIds.length < 16) {
    console.error(`✗ Need ≥16 GD01 cards, found ${cardIds.length}.`)
    process.exit(1)
  }

  for (let i = 0; i < TRADERS.length; i++) {
    const t = TRADERS[i]
    await deleteFake(t.handle) // start clean

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: EMAIL(t.handle),
      password: PASSWORD,
      email_confirm: true,
    })
    if (cErr || !created?.user) {
      console.error(`✗ createUser ${t.handle}:`, cErr?.message)
      continue
    }
    const uid = created.user.id
    const lat = round2(anchor.lat + t.dlat)
    const lng = round2(anchor.lng + t.dlng)

    const { error: profErr } = await admin
      .from('profiles')
      .insert({ id: uid, handle: t.handle, games: ['gundam'], lat, lng })
    if (profErr) {
      console.error(`✗ profile ${t.handle}:`, profErr.message)
      continue
    }
    if (t.ship) {
      await admin.from('profiles').update({ willing_to_ship: true }).eq('id', uid)
    }

    const { data: binder, error: bErr } = await admin
      .from('binders')
      .insert({ user_id: uid, name: `${t.handle}'s Trade Binder`, is_public: true, binder_type: 'trade' })
      .select()
      .single()
    if (bErr || !binder) {
      console.error(`✗ binder ${t.handle}:`, bErr?.message)
      continue
    }

    // Offer 7 cards (overlapping slices so traders share some cards).
    const offer = cardIds.slice(i * 5, i * 5 + 7)
    for (let j = 0; j < offer.length; j++) {
      const { error } = await admin.from('binder_items').insert({
        binder_id: binder.id,
        card_id: offer[j],
        quantity: 1 + (j % 3),
        condition: (['NM', 'LP', 'MP'] as const)[j % 3],
        is_foil: j % 4 === 0,
      })
      if (error) console.error(`  binder_item ${offer[j]}:`, error.message)
    }

    // Want 4 cards from the back of the pool.
    const wants = cardIds.slice(24 + i * 4, 24 + i * 4 + 4)
    for (const cid of wants) {
      const { error } = await admin.from('wantlist_items').insert({ user_id: uid, card_id: cid })
      if (error) console.error(`  wantlist ${cid}:`, error.message)
    }

    console.log(`✓ @${t.handle} @ (${lat}, ${lng}) — ${offer.length} for trade, ${wants.length} wanted${t.ship ? ' · ships' : ''}`)
  }
  console.log('\n✓ Done. Reload Browse/Wanted in the app.')
}

const run = process.argv.includes('--clean') ? clean : seed
run().catch((e) => {
  console.error('✗ FATAL:', e)
  process.exit(1)
})
