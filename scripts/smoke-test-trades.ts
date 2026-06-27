/**
 * Security + flow smoke test for the trade / messaging / proposal / push system.
 *
 * Creates THREE real users (Alice, Bob, Carol) signed in with the anon key so
 * RLS is actually enforced (no service-role bypass). Verifies the full trade
 * loop AND that a third party (Carol) can never read or write into a trade she
 * isn't part of — the critical guarantee for a messaging app.
 *
 *   cd scripts && npx tsx smoke-test-trades.ts
 */
import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.SUPABASE_ANON_KEY
if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('✗ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in scripts/.env')
  process.exit(1)
}

const RUN = Date.now().toString(36)
const PASSWORD = 'SmokeTest!123Long'
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

let passed = 0
let failed = 0
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${name}\n      → ${(err as Error).message}`)
    failed++
  }
}
function section(s: string) { console.log(`\n▶ ${s}`) }
function assert(cond: any, msg: string) { if (!cond) throw new Error(msg) }

type User = { id: string; client: SupabaseClient }
async function mkUser(tag: string): Promise<User> {
  const email = `smoke-trade-${tag}-${RUN}@bindar.test`
  const { data: created, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error) throw new Error(`createUser ${tag}: ${error.message}`)
  const client = createClient(SUPABASE_URL!, ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error: sErr } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (sErr) throw new Error(`signIn ${tag}: ${sErr.message}`)
  await client.from('profiles').insert({ id: created.user.id, handle: `smk${tag}${RUN}`.slice(0, 20), games: ['gundam'], lat: 43.96, lng: -79.25 })
  return { id: created.user.id, client }
}
async function cleanup() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  for (const u of (data?.users ?? []).filter((x) => x.email?.startsWith('smoke-trade-'))) {
    await admin.auth.admin.deleteUser(u.id).catch(() => undefined)
  }
}

async function run() {
  await cleanup()

  const { data: cards } = await admin.from('cards').select('id').limit(2)
  if (!cards || cards.length < 2) { console.error('✗ Need ≥2 cards. Run the scraper.'); process.exit(1) }
  const [cardA, cardB] = cards.map((c) => c.id)

  section('Create users A, B, C')
  let A!: User, B!: User, C!: User
  await test('create Alice / Bob / Carol', async () => { A = await mkUser('a'); B = await mkUser('b'); C = await mkUser('c') })
  if (!A || !B || !C) { await cleanup(); process.exit(1) }

  // Give A and B a public card each (so proposals reference real public cards).
  async function publicCard(u: User, card: string) {
    const { data: binder } = await u.client.from('binders').insert({ name: 'Trade', is_public: true, binder_type: 'trade' }).select('id').single()
    await u.client.from('binder_items').insert({ binder_id: binder!.id, card_id: card, condition: 'NM', is_foil: false })
  }
  await test('A & B each list a public card', async () => { await publicCard(A, cardA); await publicCard(B, cardB) })

  let tradeId = ''
  let proposalId = ''

  try {
    section('Trades + RLS')
    await test('A opens a trade with B', async () => {
      const { data, error } = await A.client.from('trades').insert({ recipient_id: B.id }).select('id').single()
      if (error) throw error
      tradeId = data.id
    })
    await test('A and B can read the trade', async () => {
      const a = await A.client.from('trades').select('id').eq('id', tradeId)
      const b = await B.client.from('trades').select('id').eq('id', tradeId)
      assert(a.data?.length === 1 && b.data?.length === 1, 'both participants must read it')
    })
    await test('LEAK: Carol cannot read the A↔B trade', async () => {
      const { data } = await C.client.from('trades').select('id').eq('id', tradeId)
      assert((data?.length ?? 0) === 0, 'Carol saw a trade she is not part of')
    })
    await test('A cannot forge a trade as Bob (requester impersonation)', async () => {
      const { error } = await A.client.from('trades').insert({ requester_id: B.id, recipient_id: C.id })
      assert(!!error, 'impersonated requester insert was allowed')
    })
    await test('self-trade rejected', async () => {
      const { error } = await A.client.from('trades').insert({ recipient_id: A.id })
      assert(!!error, 'self-trade was allowed')
    })

    section('Messages + RLS')
    await test('A sends a message', async () => {
      const { error } = await A.client.from('messages').insert({ trade_id: tradeId, body: 'hi bob' })
      if (error) throw error
    })
    await test('B can read the message', async () => {
      const { data } = await B.client.from('messages').select('id').eq('trade_id', tradeId)
      assert((data?.length ?? 0) >= 1, 'participant could not read message')
    })
    await test('LEAK: Carol cannot read the messages', async () => {
      const { data } = await C.client.from('messages').select('id').eq('trade_id', tradeId)
      assert((data?.length ?? 0) === 0, 'Carol read messages in a trade she is not in')
    })
    await test('Carol cannot post into the A↔B trade', async () => {
      const { error } = await C.client.from('messages').insert({ trade_id: tradeId, body: 'sneak' })
      assert(!!error, 'non-participant could post a message')
    })
    await test('A cannot send a message as Bob (sender impersonation)', async () => {
      const { error } = await A.client.from('messages').insert({ trade_id: tradeId, sender_id: B.id, body: 'forged' })
      assert(!!error, 'impersonated sender was allowed')
    })

    section('Proposals + RLS')
    await test('A creates a proposal with give/get + cash', async () => {
      const { data, error } = await A.client.from('trade_proposals').insert({ trade_id: tradeId, cash_cents: 500 }).select('id').single()
      if (error) throw error
      proposalId = data.id
      const { error: iErr } = await A.client.from('trade_proposal_items').insert([
        { proposal_id: proposalId, side: 'give', card_id: cardA, quantity: 1, condition: 'NM', is_foil: false },
        { proposal_id: proposalId, side: 'get', card_id: cardB, quantity: 1, condition: 'NM', is_foil: false },
      ])
      if (iErr) throw iErr
    })
    await test('B can read the proposal + items', async () => {
      const p = await B.client.from('trade_proposals').select('id').eq('id', proposalId)
      const it = await B.client.from('trade_proposal_items').select('id').eq('proposal_id', proposalId)
      assert(p.data?.length === 1 && (it.data?.length ?? 0) === 2, 'participant could not read proposal/items')
    })
    await test('LEAK: Carol cannot read the proposal or items', async () => {
      const p = await C.client.from('trade_proposals').select('id').eq('id', proposalId)
      const it = await C.client.from('trade_proposal_items').select('id').eq('proposal_id', proposalId)
      assert((p.data?.length ?? 0) === 0 && (it.data?.length ?? 0) === 0, 'Carol read a proposal she is not part of')
    })
    await test('Carol cannot create a proposal in the A↔B trade', async () => {
      const { error } = await C.client.from('trade_proposals').insert({ trade_id: tradeId })
      assert(!!error, 'non-participant created a proposal')
    })
    await test('B accepts the proposal', async () => {
      const { data, error } = await B.client.from('trade_proposals').update({ status: 'accepted' }).eq('id', proposalId).select('status')
      if (error) throw error
      assert(data?.length === 1 && data[0].status === 'accepted', 'accept did not apply')
      await B.client.from('trades').update({ status: 'accepted' }).eq('id', tradeId)
    })
    await test('LEAK: Carol cannot change the proposal status', async () => {
      const { data } = await C.client.from('trade_proposals').update({ status: 'declined' }).eq('id', proposalId).select('id')
      assert((data?.length ?? 0) === 0, 'Carol modified a proposal she is not part of')
    })

    section('Inquiry message')
    await test('A posts an inquiry card message', async () => {
      const { error } = await A.client.from('messages').insert({ trade_id: tradeId, kind: 'inquiry', card_id: cardB, body: `Interested in ${cardB}` })
      if (error) throw error
    })

    section('Push tokens + RLS')
    await test('A registers her own push token', async () => {
      const { error } = await A.client.from('push_tokens').insert({ user_id: A.id, token: `tok-${RUN}`, platform: 'android' })
      if (error) throw error
    })
    await test('LEAK: Carol cannot read Alice’s push tokens', async () => {
      const { data } = await C.client.from('push_tokens').select('token').eq('user_id', A.id)
      assert((data?.length ?? 0) === 0, 'Carol read another user’s push tokens')
    })
    await test('Carol cannot register a token for Alice', async () => {
      const { error } = await C.client.from('push_tokens').insert({ user_id: A.id, token: 'evil' })
      assert(!!error, 'a token could be forged for another user')
    })
  } finally {
    await cleanup()
  }

  console.log(`\n${failed === 0 ? '✅' : '❌'}  ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((e) => { console.error('FATAL:', e); cleanup().finally(() => process.exit(1)) })
