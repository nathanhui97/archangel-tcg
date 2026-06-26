/**
 * End-to-end smoke test for the Bindar backend.
 *
 * Creates two test users (Alice + Bob), signs them in with the public anon
 * key, and walks every CRUD path the app actually uses. Verifies that:
 *   - Profiles can be created with the auth.uid() default working
 *   - Binders enforce public/private RLS in both directions
 *   - binder_items inherit their parent binder's visibility
 *   - Wantlists are readable across users (for matching) but writable own-only
 *   - The matching join produces the expected overlap
 *
 * Always cleans up both users (cascades delete everything they own).
 *
 * Run with:
 *   cd scripts && NODE_TLS_REJECT_UNAUTHORIZED=0 npm run smoke-test
 */

import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error(
    '✗ Missing env vars. Need: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY\n' +
      '  Copy scripts/.env.example to scripts/.env and fill in all three.'
  )
  process.exit(1)
}

// Distinctive emails so cleanup can find them
const RUN_ID = Date.now().toString(36)
const ALICE_EMAIL = `smoke-alice-${RUN_ID}@bindar.test`
const BOB_EMAIL = `smoke-bob-${RUN_ID}@bindar.test`
const PASSWORD = 'SmokeTest!123Long'

// Service-role client bypasses RLS, used for setup + teardown only
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─────────────────────────────────────────────────────────────────────────
// Test runner state
// ─────────────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
const failures: string[] = []

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    const msg = (err as Error).message
    console.log(`  ✗ ${name}\n      → ${msg}`)
    failures.push(`${name}: ${msg}`)
    failed++
  }
}

function section(label: string) {
  console.log(`\n▶ ${label}`)
}

// ─────────────────────────────────────────────────────────────────────────
// User setup
// ─────────────────────────────────────────────────────────────────────────

type User = { id: string; email: string; client: SupabaseClient }

async function createTestUser(email: string): Promise<User> {
  // Create the auth user (admin API skips email verification)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (createErr) throw new Error(`createUser ${email}: ${createErr.message}`)
  const id = created.user.id

  // Sign in with the anon client to get a real user session
  const client = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (signInErr) throw new Error(`signIn ${email}: ${signInErr.message}`)

  return { id, email, client }
}

async function deleteTestUser(email: string) {
  // listUsers paginates by 50 default; fine for our tiny test
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const user = data?.users.find((u) => u.email === email)
  if (user) await admin.auth.admin.deleteUser(user.id)
}

async function cleanup() {
  // Best-effort delete — both test users + any from prior failed runs that match our prefix
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const stale = (data?.users ?? []).filter((u) => u.email?.startsWith('smoke-alice-') || u.email?.startsWith('smoke-bob-'))
  for (const u of stale) {
    await admin.auth.admin.deleteUser(u.id).catch(() => undefined)
  }
}

// ─────────────────────────────────────────────────────────────────────────
// The actual test
// ─────────────────────────────────────────────────────────────────────────

async function run() {
  console.log('▶ Preflight: clean any stale test users from prior runs')
  await cleanup()

  section('Cards catalog')

  let sampleCardId: string | null = null
  await test('At least one card exists (run the scraper first if this fails)', async () => {
    const { data, error } = await admin
      .from('cards')
      .select('id')
      .limit(1)
      .single()
    if (error || !data) throw new Error(error?.message ?? 'no cards in DB')
    sampleCardId = data.id
  })

  if (!sampleCardId) {
    console.log('\n✗ Cannot continue without cards in the DB.')
    process.exit(1)
  }

  section('Create test users')

  let alice: User | null = null
  let bob: User | null = null

  await test('Create Alice', async () => {
    alice = await createTestUser(ALICE_EMAIL)
  })
  await test('Create Bob', async () => {
    bob = await createTestUser(BOB_EMAIL)
  })

  if (!alice || !bob) {
    console.log('\n✗ Cannot continue without test users.')
    await cleanup()
    process.exit(1)
  }

  // From here on we know alice + bob are non-null
  const A = alice as User
  const B = bob as User

  try {
    // ─── Profiles ────────────────────────────────────────────────────────
    section('Profiles')

    await test('Alice creates her profile', async () => {
      const { error } = await A.client.from('profiles').insert({
        id: A.id,
        handle: `alice_${RUN_ID}`,
        games: ['gundam', 'one_piece'],
        lat: 37.77,
        lng: -122.41,
      })
      if (error) throw error
    })

    await test('Bob creates his profile', async () => {
      const { error } = await B.client.from('profiles').insert({
        id: B.id,
        handle: `bob_${RUN_ID}`,
        games: ['gundam'],
        lat: 37.79,
        lng: -122.42,
      })
      if (error) throw error
    })

    await test('Handle uniqueness is enforced', async () => {
      const { error } = await B.client
        .from('profiles')
        .update({ handle: `alice_${RUN_ID}` })
        .eq('id', B.id)
      if (!error) throw new Error('Bob updated his handle to Alice\'s — uniqueness broken')
    })

    await test('Alice can read her own profile fully', async () => {
      const { data, error } = await A.client.from('profiles').select('*').eq('id', A.id).maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Alice could not read herself')
    })

    await test('Bob can read Alice\'s public profile fields', async () => {
      const { data, error } = await B.client
        .from('public_profiles')
        .select('id, handle, games, lat, lng')
        .eq('id', A.id)
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Bob could not read Alice via public_profiles view')
    })

    // ─── Binders ─────────────────────────────────────────────────────────
    section('Binders')

    let alicePublicBinderId = ''
    let alicePrivateBinderId = ''

    await test('Alice creates a public binder (user_id auto-filled by default)', async () => {
      const { data, error } = await A.client
        .from('binders')
        .insert({ name: 'Alice Public Binder', is_public: true })
        .select()
        .single()
      if (error) throw error
      if (data.user_id !== A.id) throw new Error('user_id default did not pick up auth.uid()')
      alicePublicBinderId = data.id
    })

    await test('Alice creates a private binder', async () => {
      const { data, error } = await A.client
        .from('binders')
        .insert({ name: 'Alice Private Binder', is_public: false })
        .select()
        .single()
      if (error) throw error
      alicePrivateBinderId = data.id
    })

    await test('Bob can read Alice\'s PUBLIC binder', async () => {
      const { data, error } = await B.client.from('binders').select('*').eq('id', alicePublicBinderId).maybeSingle()
      if (error) throw error
      if (!data) throw new Error('public binder hidden from other users')
    })

    await test('RLS: Bob CANNOT read Alice\'s PRIVATE binder', async () => {
      const { data } = await B.client.from('binders').select('*').eq('id', alicePrivateBinderId).maybeSingle()
      if (data) throw new Error('RLS LEAK: private binder visible to other users')
    })

    await test('RLS: Bob CANNOT update Alice\'s binder', async () => {
      const { data, error } = await B.client
        .from('binders')
        .update({ name: 'HACKED' })
        .eq('id', alicePublicBinderId)
        .select()
      // Either an error, or an empty result set (because RLS hid the row from the UPDATE)
      if (!error && data && data.length > 0) throw new Error('RLS LEAK: Bob updated Alice\'s binder')
    })

    // ─── Binder items ───────────────────────────────────────────────────
    section('Binder items')

    await test('Alice adds a card to her public binder', async () => {
      const { error } = await A.client.from('binder_items').insert({
        binder_id: alicePublicBinderId,
        card_id: sampleCardId,
        quantity: 2,
        condition: 'NM',
        is_foil: false,
      })
      if (error) throw error
    })

    await test('Duplicate (same card+condition+foil) is allowed (separate entry)', async () => {
      const { error } = await A.client.from('binder_items').insert({
        binder_id: alicePublicBinderId,
        card_id: sampleCardId,
        quantity: 1,
        condition: 'NM',
        is_foil: false,
      })
      if (error) throw new Error(`duplicate insert blocked: ${error.message}`)
    })

    await test('Different condition is allowed (same card, different print)', async () => {
      const { error } = await A.client.from('binder_items').insert({
        binder_id: alicePublicBinderId,
        card_id: sampleCardId,
        quantity: 1,
        condition: 'LP',
        is_foil: false,
      })
      if (error) throw error
    })

    await test('Alice adds a card to her PRIVATE binder', async () => {
      const { error } = await A.client.from('binder_items').insert({
        binder_id: alicePrivateBinderId,
        card_id: sampleCardId,
        quantity: 1,
        condition: 'NM',
        is_foil: false,
      })
      if (error) throw error
    })

    await test('Bob sees items in Alice\'s PUBLIC binder', async () => {
      const { data, error } = await B.client
        .from('binder_items')
        .select('*')
        .eq('binder_id', alicePublicBinderId)
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Bob saw zero items in public binder')
    })

    await test('RLS: Bob CANNOT see items in Alice\'s PRIVATE binder', async () => {
      const { data } = await B.client
        .from('binder_items')
        .select('*')
        .eq('binder_id', alicePrivateBinderId)
      if (data && data.length > 0) throw new Error('RLS LEAK: private binder items visible')
    })

    await test('RLS: Bob CANNOT insert into Alice\'s binder', async () => {
      const { error } = await B.client.from('binder_items').insert({
        binder_id: alicePublicBinderId,
        card_id: sampleCardId,
        quantity: 1,
        condition: 'NM',
        is_foil: false,
      })
      if (!error) throw new Error('RLS LEAK: Bob inserted into Alice\'s binder')
    })

    // ─── Wantlist ───────────────────────────────────────────────────────
    section('Wantlist')

    await test('Bob adds the sample card to his wantlist', async () => {
      const { error } = await B.client.from('wantlist_items').insert({ card_id: sampleCardId })
      if (error) throw error
    })

    await test('Duplicate wantlist add blocked by unique index', async () => {
      const { error } = await B.client.from('wantlist_items').insert({ card_id: sampleCardId })
      if (!error) throw new Error('duplicate wantlist insert succeeded')
    })

    await test('Alice can READ Bob\'s wantlist (public-by-design for matching)', async () => {
      const { data, error } = await A.client
        .from('wantlist_items')
        .select('*')
        .eq('user_id', B.id)
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Alice saw zero wantlist items')
    })

    await test('RLS: Alice CANNOT add to Bob\'s wantlist', async () => {
      // Try with explicit user_id of Bob — should fail
      const { error } = await A.client.from('wantlist_items').insert({
        user_id: B.id,
        card_id: sampleCardId,
      })
      if (!error) throw new Error('RLS LEAK: Alice added to Bob\'s wantlist')
    })

    // ─── Matching query ─────────────────────────────────────────────────
    section('Matching query (the magic moment)')

    await test('Bob\'s wantlist intersects Alice\'s public binders', async () => {
      // Get Bob's wantlist card IDs
      const { data: wants } = await B.client.from('wantlist_items').select('card_id').eq('user_id', B.id)
      const wantIds = (wants ?? []).map((w) => w.card_id)
      if (wantIds.length === 0) throw new Error('Bob has nothing on his wantlist')

      // Find other users' public binder items whose card_id is on Bob's wantlist
      const { data: matches, error } = await B.client
        .from('binder_items')
        .select('card_id, binder:binders!inner(user_id, is_public, name)')
        .in('card_id', wantIds)
      if (error) throw error

      const publicOnly = (matches ?? []).filter((m: any) => m.binder?.is_public === true)
      if (publicOnly.length === 0) throw new Error('Match query returned zero results')
    })

    await test('Matching query does NOT leak private binders', async () => {
      const { data: matches } = await B.client
        .from('binder_items')
        .select('binder:binders!inner(is_public)')
        .eq('card_id', sampleCardId)
      const sawPrivate = (matches ?? []).some((m: any) => m.binder?.is_public === false)
      if (sawPrivate) throw new Error('RLS LEAK: private binder appeared in match query')
    })
  } finally {
    section('Cleanup')
    await cleanup()
    console.log('  ✓ All test users deleted (cascades all owned rows)')
  }

  // ─── Summary ────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(56))
  console.log(`▶ ${passed} passed · ${failed} failed`)
  if (failed > 0) {
    console.log('\nFailures:')
    failures.forEach((f) => console.log(`  · ${f}`))
    process.exit(1)
  }
  console.log('\n✓ All backend smoke tests passed.')
}

run().catch(async (err) => {
  console.error('\n✗ FATAL:', err)
  await cleanup().catch(() => undefined)
  process.exit(1)
})
