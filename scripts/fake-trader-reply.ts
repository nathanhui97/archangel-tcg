/**
 * Simulate the OTHER side of a trade so you can test the full loop in Expo Go.
 *
 * Finds the most recently-active trade where YOU reached out to a seeded fake
 * trader, accepts any pending proposal in it, and posts a reply from the fake
 * trader. Re-run after each proposal to keep the conversation going.
 *
 *   cd scripts && npx tsx fake-trader-reply.ts
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  // Identify the seeded fake traders by their @bindar.test emails.
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const fakeIds = new Set(
    (usersPage?.users ?? []).filter((u) => u.email?.startsWith('faketrader-')).map((u) => u.id)
  )
  if (fakeIds.size === 0) {
    console.error('✗ No fake traders found. Run: npx tsx seed-fake-traders.ts')
    process.exit(1)
  }

  // Most recently-active trade where the fake trader is the recipient (you reached out).
  const { data: trades } = await admin
    .from('trades')
    .select('*')
    .order('updated_at', { ascending: false })
  const trade = (trades ?? []).find((t: any) => fakeIds.has(t.recipient_id))
  if (!trade) {
    console.error('✗ No conversation where you requested a fake trader yet. Send a Request/Inquire first.')
    process.exit(1)
  }

  const fakeId = trade.recipient_id
  const { data: fakeProfile } = await admin.from('profiles').select('handle').eq('id', fakeId).maybeSingle()
  const handle = fakeProfile?.handle ?? 'trader'

  // Accept any pending proposals.
  const { data: props } = await admin
    .from('trade_proposals')
    .select('id')
    .eq('trade_id', trade.id)
    .eq('status', 'pending')
  let accepted = 0
  for (const p of props ?? []) {
    await admin.from('trade_proposals').update({ status: 'accepted' }).eq('id', p.id)
    accepted++
  }
  if (accepted > 0) {
    await admin.from('trades').update({ status: 'accepted' }).eq('id', trade.id)
    console.log(`✓ @${handle} accepted ${accepted} proposal(s) → trade accepted`)
  }

  // Reply as the fake trader.
  const body =
    accepted > 0
      ? 'Deal! Want to meet at the local game shop Saturday around 2pm?'
      : 'Hey! Yeah it’s still available — what were you thinking of offering?'
  const { error } = await admin.from('messages').insert({ trade_id: trade.id, sender_id: fakeId, body })
  if (error) {
    console.error('✗ reply failed:', error.message)
    process.exit(1)
  }
  console.log(`✓ @${handle} replied: “${body}”`)
  console.log('\nReload the chat in the app (or wait ~4s) to see it.')
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
