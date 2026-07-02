/**
 * Founder verification tool. Pull photos are private (verification only), so you
 * review them here with the service-role key and grant the ✓.
 *
 *   cd scripts && npm run review:pulls                      # list pending (with photo links)
 *   cd scripts && npm run review:pulls -- --approve=<id>    # verify a pull (+ verify the trader)
 *   cd scripts && npm run review:pulls -- --reject=<id>     # drop the photo, leave it unverified
 *
 * "Pending" = a pull that has a photo but no verified_at yet.
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
const APPROVE = arg('approve')
const REJECT = arg('reject')
const APPROVE_BINDER = arg('approve-binder')
const REJECT_BINDER = arg('reject-binder')

async function approve(pullId: string) {
  const { data: pull, error } = await supabase.from('pulls').select('id, user_id').eq('id', pullId).maybeSingle()
  if (error || !pull) {
    console.error(`✗ pull ${pullId} not found`)
    process.exit(1)
  }
  const now = new Date().toISOString()
  const { error: e1 } = await supabase.from('pulls').update({ verified_at: now }).eq('id', pullId)
  if (e1) throw new Error(e1.message)
  // First verified pull also earns the trader the ✓ badge.
  await supabase.from('profiles').update({ verified_at: now }).eq('id', pull.user_id).is('verified_at', null)
  console.log(`✓ approved pull ${pullId} — it now shows Verified, and @owner is a verified trader.`)
}

async function reject(pullId: string) {
  const { error } = await supabase.from('pulls').update({ photo_path: null }).eq('id', pullId)
  if (error) throw new Error(error.message)
  console.log(`✗ rejected pull ${pullId} — photo dropped, stays unverified.`)
}

// ── Binder verifications ─────────────────────────────────────────────────
async function approveBinder(verId: string) {
  const { data: v } = await supabase
    .from('binder_verifications')
    .select('id, binder_id, user_id')
    .eq('id', verId)
    .maybeSingle()
  if (!v) {
    console.error(`✗ binder verification ${verId} not found`)
    process.exit(1)
  }
  const now = new Date().toISOString()
  await supabase.from('binder_verifications').update({ status: 'approved', reviewed_at: now }).eq('id', verId)
  await supabase.from('binders').update({ verified_at: now }).eq('id', v.binder_id)
  await supabase.from('profiles').update({ verified_at: now }).eq('id', v.user_id).is('verified_at', null)
  console.log(`✓ approved — binder now shows Verified, and its owner is a verified trader.`)
}

async function rejectBinder(verId: string) {
  const { error } = await supabase
    .from('binder_verifications')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', verId)
  if (error) throw new Error(error.message)
  console.log(`✗ rejected binder verification ${verId}.`)
}

async function listBinderVerifications() {
  const { data: vers } = await supabase
    .from('binder_verifications')
    .select('id, binder_id, user_id, note, photo_paths, submitted_at')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })
  if (!vers || vers.length === 0) {
    console.log('  No binder verifications pending.\n')
    return
  }
  const binderIds = Array.from(new Set(vers.map((v) => v.binder_id)))
  const userIds = Array.from(new Set(vers.map((v) => v.user_id)))
  const [{ data: binders }, { data: profiles }] = await Promise.all([
    supabase.from('binders').select('id, name').in('id', binderIds),
    supabase.from('profiles').select('id, handle').in('id', userIds),
  ])
  const binderName = new Map((binders ?? []).map((b) => [b.id, b.name]))
  const handle = new Map((profiles ?? []).map((p) => [p.id, p.handle]))

  console.log(`\n  ${vers.length} binder verification(s) pending:\n`)
  for (const v of vers) {
    console.log(`  ── @${handle.get(v.user_id) ?? '?'}  ·  binder “${binderName.get(v.binder_id) ?? v.binder_id}”`)
    if (v.note) console.log(`     note: “${v.note}”`)
    for (let i = 0; i < v.photo_paths.length; i++) {
      const { data: signed } = await supabase.storage.from('pull-photos').createSignedUrl(v.photo_paths[i], 3600)
      console.log(`     photo ${i + 1}: ${signed?.signedUrl ?? '(no url)'}`)
    }
    console.log(`     verify (cards already there): npm run review:pulls -- --approve-binder=${v.id}`)
    console.log(`     add cards from photo:         npm run build-binder -- --binder=${v.binder_id} --cards=ID1,ID2`)
    console.log(`     reject:                       npm run review:pulls -- --reject-binder=${v.id}\n`)
  }
}

async function listPulls() {
  const { data: pulls, error } = await supabase
    .from('pulls')
    .select('id, user_id, card_id, caption, photo_path, created_at')
    .not('photo_path', 'is', null)
    .is('verified_at', null)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  if (!pulls || pulls.length === 0) {
    console.log('\n  No pulls pending.')
    return
  }

  // Enrich with card name + handle.
  const cardIds = Array.from(new Set(pulls.map((p) => p.card_id)))
  const userIds = Array.from(new Set(pulls.map((p) => p.user_id)))
  const [{ data: cards }, { data: profiles }] = await Promise.all([
    supabase.from('cards').select('id, name').in('id', cardIds),
    supabase.from('profiles').select('id, handle').in('id', userIds),
  ])
  const cardName = new Map((cards ?? []).map((c) => [c.id, c.name]))
  const handle = new Map((profiles ?? []).map((p) => [p.id, p.handle]))

  console.log(`\n  ${pulls.length} pull(s) awaiting review:\n`)
  for (const p of pulls) {
    const { data: signed } = await supabase.storage.from('pull-photos').createSignedUrl(p.photo_path!, 3600)
    console.log(`  ── @${handle.get(p.user_id) ?? '?'}  ·  ${cardName.get(p.card_id) ?? p.card_id}  (${p.card_id})`)
    if (p.caption) console.log(`     “${p.caption}”`)
    console.log(`     photo:   ${signed?.signedUrl ?? '(no url)'}`)
    console.log(`     approve: npm run review:pulls -- --approve=${p.id}`)
    console.log(`     reject:  npm run review:pulls -- --reject=${p.id}\n`)
  }
}

async function main() {
  if (APPROVE) return approve(APPROVE)
  if (REJECT) return reject(REJECT)
  if (APPROVE_BINDER) return approveBinder(APPROVE_BINDER)
  if (REJECT_BINDER) return rejectBinder(REJECT_BINDER)
  await listPulls()
  await listBinderVerifications()
  console.log('  Open a photo link to check it, then run its approve command.\n')
}

main().catch((e) => {
  console.error('\n✗ review failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})
