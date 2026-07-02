/**
 * Concierge tool: hand-build a verified binder for a user from the photo they
 * submitted. You read the card IDs off their photo and pass them here.
 *
 * Fill an existing (e.g. just-submitted) binder + verify it:
 *   cd scripts && npm run build-binder -- --binder=<binderId> --cards=GD01-001,ST01-005
 *
 * Or create a fresh binder for a user + verify it:
 *   cd scripts && npm run build-binder -- --user=<handle> --name="For Trade" --cards=GD01-001 --public
 *
 * Either way it: adds the cards (NM, qty 1), stamps the binder Verified, makes
 * the owner a verified trader, and closes any pending verification for it.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in scripts/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const BINDER = arg('binder')
const USER = arg('user') // handle
const NAME = arg('name')
const CARDS = (arg('cards') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const PUBLIC = process.argv.includes('--public')

async function resolveBinder(): Promise<{ binderId: string; userId: string }> {
  if (BINDER) {
    const { data, error } = await supabase.from('binders').select('id, user_id').eq('id', BINDER).maybeSingle()
    if (error || !data) throw new Error(`binder ${BINDER} not found`)
    return { binderId: data.id, userId: data.user_id }
  }
  if (USER && NAME) {
    const { data: prof } = await supabase.from('profiles').select('id').eq('handle', USER).maybeSingle()
    if (!prof) throw new Error(`user @${USER} not found`)
    const { data: created, error } = await supabase
      .from('binders')
      .insert({ user_id: prof.id, name: NAME, is_public: PUBLIC })
      .select('id, user_id')
      .single()
    if (error || !created) throw new Error(`create binder → ${error?.message}`)
    console.log(`  created binder “${NAME}” for @${USER}`)
    return { binderId: created.id, userId: created.user_id }
  }
  throw new Error('pass either --binder=<id>  OR  --user=<handle> --name="…"')
}

async function main() {
  if (CARDS.length === 0) throw new Error('pass --cards=ID1,ID2,…')

  const { binderId, userId } = await resolveBinder()

  // Validate card IDs against the catalog; warn on any that don't exist.
  const { data: known } = await supabase.from('cards').select('id').in('id', CARDS)
  const knownIds = new Set((known ?? []).map((c) => c.id))
  const missing = CARDS.filter((id) => !knownIds.has(id))
  if (missing.length) console.warn(`  ⚠ skipping unknown card ids: ${missing.join(', ')}`)
  const toAdd = CARDS.filter((id) => knownIds.has(id))
  if (toAdd.length === 0) throw new Error('none of the given card ids exist')

  const rows = toAdd.map((card_id) => ({ binder_id: binderId, card_id, condition: 'NM', quantity: 1, is_foil: false }))
  const { error: insErr } = await supabase.from('binder_items').insert(rows)
  if (insErr) throw new Error(`add cards → ${insErr.message}`)
  console.log(`  added ${rows.length} card(s)`)

  const now = new Date().toISOString()
  await supabase.from('binders').update({ verified_at: now }).eq('id', binderId)
  await supabase.from('profiles').update({ verified_at: now }).eq('id', userId).is('verified_at', null)
  await supabase
    .from('binder_verifications')
    .update({ status: 'approved', reviewed_at: now })
    .eq('binder_id', binderId)
    .eq('status', 'pending')

  console.log(`  ✓ binder verified + owner is a verified trader. Any pending request for it is closed.\n`)
}

main().catch((e) => {
  console.error('\n✗ build-binder failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})
