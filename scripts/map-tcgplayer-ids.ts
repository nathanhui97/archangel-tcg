/**
 * One-time (re-runnable) mapping of our Gundam `cards` rows → TCGplayer
 * product IDs, sourced from tcgcsv.com.
 *
 * The lucky break: TCGplayer stores the official card number in our exact
 * format (extendedData "Number" = "GD01-001"), so base prints join almost
 * perfectly on that key. The work is only the long tail — alt arts (which
 * share a base number) and promos/tokens that don't line up 1:1.
 *
 * What it does:
 *   1. GET tcgcsv groups for Gundam (category 86)            → every set
 *   2. GET products per group                                → Number → product(s)
 *   3. For each of our `game='gundam'` cards, resolve its product:
 *        - exactly one candidate            → confident match
 *        - base print, one non-alt candidate→ confident match
 *        - alt art, one alt candidate        → confident match
 *        - anything else / none              → write to a review CSV
 *   4. Print a match-rate summary. With --write, persist confident matches
 *      to cards.tcgplayer_product_id.
 *
 * Run with:
 *   cd scripts && npm run map:tcgplayer            # dry run: report only
 *   cd scripts && npm run map:tcgplayer -- --write # persist confident matches
 *
 * Flags:
 *   --write           actually update cards.tcgplayer_product_id (default: dry run)
 *   --sets=GD01,ST04  only consider these set codes (matches our set_code)
 *
 * Re-running is safe — it upserts the same column and only touches confident rows.
 */

import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      '  Copy scripts/.env.example to scripts/.env and fill in your keys.'
  )
  process.exit(1)
}

const GUNDAM_CATEGORY_ID = 86 // TCGplayer category for the Gundam Card Game
const TCGCSV_BASE = 'https://tcgcsv.com/tcgplayer'
const POLITE_DELAY_MS = 300
const USER_AGENT = 'Mozilla/5.0 Bindar-PriceMapper (contact: github.com/nathanhui97/archangel-tcg)'
const REVIEW_CSV = 'tcgplayer-mapping-review.csv'

const WRITE = process.argv.includes('--write')
const ONLY_SETS = (() => {
  const a = process.argv.find((x) => x.startsWith('--sets='))
  return a ? new Set(a.split('=')[1].split(',').map((s) => s.toUpperCase())) : null
})()

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─────────────────────────────────────────────────────────────────────────
// tcgcsv helpers
// ─────────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return (await res.json()) as T
}

type Group = { groupId: number; name: string; abbreviation?: string }
type ExtData = { name: string; value: string }
type Product = { productId: number; name: string; cleanName?: string; extendedData?: ExtData[]; groupAbbr?: string }

/** tcgcsv mirrors TCGplayer's `{ success, results }` envelope. */
type Envelope<T> = { success?: boolean; results?: T[] }

function ext(p: Product, key: string): string | null {
  return p.extendedData?.find((e) => e.name.toLowerCase() === key.toLowerCase())?.value ?? null
}

/**
 * Normalize a rarity string to a comparable token. TCGplayer writes base prints
 * as full words ("Legend Rare") and parallels with a "+" suffix ("LR+", "LR++",
 * "C+"); our scraper stores the abbreviation ("LR", and "LR +" for parallels).
 * Both collapse to the same token: "Legend Rare" → "LR", "LR +" → "LR+".
 */
const RARITY_WORD: Record<string, string> = {
  COMMON: 'C', UNCOMMON: 'U', RARE: 'R', SUPERRARE: 'SR', LEGENDRARE: 'LR',
}
function normRarity(raw: string | null): string {
  if (!raw) return ''
  const s = raw.trim().toUpperCase().replace(/\s+/g, '')
  const plus = s.match(/\++$/)?.[0] ?? ''
  const core = s.slice(0, s.length - plus.length)
  return (RARITY_WORD[core] ?? core) + plus
}
/** How many trailing "+" the (normalized) rarity has — 0 = base print, 1 = first parallel, … */
function plusCount(p: Product): number {
  return normRarity(ext(p, 'Rarity')).match(/\++$/)?.[0]?.length ?? 0
}

// ─────────────────────────────────────────────────────────────────────────
// Our catalog
// ─────────────────────────────────────────────────────────────────────────
type Card = {
  id: string
  set_code: string | null
  number: string | null
  art_variant: string | null
  base_card_id: string | null
  rarity: string | null
}

async function fetchOurCards(): Promise<Card[]> {
  const rows: Card[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('cards')
      .select('id, set_code, number, art_variant, base_card_id, rarity')
      .eq('game', 'gundam')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`fetch cards → ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...(data as Card[]))
    if (data.length < PAGE) break
  }
  return rows
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────
type Resolution =
  | { status: 'matched'; productId: number; via: string }
  | { status: 'unmatched' }
  | { status: 'ambiguous'; candidates: Product[] }

/** Does the name carry a promo/event tag — a parenthetical other than the card number? */
function hasPromoSuffix(name: string, key: string): boolean {
  const stripped = name.toUpperCase().replace(`(${key})`, '')
  return /\([^)]+\)/.test(stripped)
}

function resolve(card: Card, candidates: Product[], key: string): Resolution {
  if (candidates.length === 0) return { status: 'unmatched' }

  // Prefer prints from the card's own set; this drops Edition-Beta dupes and
  // promo-group reprints (Judge Pack, Launch Kit, …) that share the number.
  const setCode = card.set_code?.toUpperCase() ?? ''
  const sameSet = candidates.filter((c) => (c.groupAbbr ?? '').toUpperCase() === setCode)
  const pool = sameSet.length ? sameSet : candidates

  const base = pool.filter((c) => plusCount(c) === 0)
  const parallels = pool
    .filter((c) => plusCount(c) > 0)
    .sort((a, b) => plusCount(a) - plusCount(b) || a.productId - b.productId)
  const named = (arr: Product[]) => arr.filter((c) => c.name.toUpperCase().includes(key))

  if (!card.art_variant) {
    // Base print → the plain-rarity, non-promo product.
    const clean = base.filter((c) => !hasPromoSuffix(c.name, key))
    if (clean.length === 1) return { status: 'matched', productId: clean[0].productId, via: 'base-rarity' }
    if (base.length === 1) return { status: 'matched', productId: base[0].productId, via: 'base-rarity' }
    const nm = named(clean.length ? clean : base.length ? base : pool)
    if (nm.length === 1) return { status: 'matched', productId: nm[0].productId, via: 'base-name' }
    return { status: 'ambiguous', candidates }
  }

  // Alt art (p1, p2, …) → a "+"-rarity parallel, preferring non-promo prints.
  const cleanPar = parallels.filter((c) => !hasPromoSuffix(c.name, key))
  const par = cleanPar.length ? cleanPar : parallels
  const ourR = normRarity(card.rarity)
  const rm = par.filter((c) => normRarity(ext(c, 'Rarity')) === ourR)
  if (rm.length === 1) return { status: 'matched', productId: rm[0].productId, via: 'alt-rarity' }
  // Fall back to position: p1 → first parallel, p2 → second, …
  const n = parseInt(String(card.art_variant).replace(/[^0-9]/g, ''), 10)
  if (Number.isFinite(n) && par[n - 1]) return { status: 'matched', productId: par[n - 1].productId, via: 'alt-position' }
  if (par.length === 1) return { status: 'matched', productId: par[0].productId, via: 'alt-sole' }
  // No rarity parallel exists — these are same-rarity promo printings of a cheap
  // common. For a soft price reference, fall back to the base print's product.
  const baseClean = base.filter((c) => !hasPromoSuffix(c.name, key)).sort((a, b) => a.productId - b.productId)
  const fallback = baseClean[0] ?? base.slice().sort((a, b) => a.productId - b.productId)[0]
  if (fallback) return { status: 'matched', productId: fallback.productId, via: 'alt-as-base' }
  return { status: 'ambiguous', candidates }
}

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function main() {
  console.log(`\n▸ Mapping our Gundam cards → TCGplayer products (category ${GUNDAM_CATEGORY_ID})`)
  console.log(`  mode: ${WRITE ? 'WRITE (will persist confident matches)' : 'dry run (report only)'}`)
  if (ONLY_SETS) console.log(`  sets: ${Array.from(ONLY_SETS).join(', ')}`)

  // 1. Groups
  const groupsEnv = await getJson<Envelope<Group>>(`${TCGCSV_BASE}/${GUNDAM_CATEGORY_ID}/groups`)
  const groups = groupsEnv.results ?? []
  console.log(`  found ${groups.length} sets on TCGplayer`)

  // 2. Products → index by Number (uppercased)
  const byNumber = new Map<string, Product[]>()
  let productCount = 0
  for (const g of groups) {
    const env = await getJson<Envelope<Product>>(`${TCGCSV_BASE}/${GUNDAM_CATEGORY_ID}/${g.groupId}/products`)
    for (const p of env.results ?? []) {
      const num = ext(p, 'Number')
      if (!num) continue
      p.groupAbbr = g.abbreviation // which set this print belongs to (GD01, GD01_b, GCG-PR, …)
      const key = num.trim().toUpperCase()
      const list = byNumber.get(key) ?? []
      list.push(p)
      byNumber.set(key, list)
      productCount++
    }
    await sleep(POLITE_DELAY_MS)
  }
  console.log(`  indexed ${productCount} products under ${byNumber.size} card numbers\n`)

  // 3. Resolve each of our cards
  const cards = await fetchOurCards()
  const scoped = ONLY_SETS ? cards.filter((c) => c.set_code && ONLY_SETS.has(c.set_code.toUpperCase())) : cards

  const matches: { id: string; productId: number }[] = []
  const viaTally = new Map<string, number>()
  const reviewRows: string[] = ['card_id,art_variant,our_rarity,status,number,candidate_productIds,candidate_names,candidate_rarities']
  let unmatched = 0
  let ambiguous = 0

  for (const card of scoped) {
    const key = (card.base_card_id ?? card.id).trim().toUpperCase()
    const candidates = byNumber.get(key) ?? []
    const r = resolve(card, candidates, key)

    if (r.status === 'matched') {
      matches.push({ id: card.id, productId: r.productId })
      viaTally.set(r.via, (viaTally.get(r.via) ?? 0) + 1)
    } else {
      if (r.status === 'unmatched') unmatched++
      else ambiguous++
      const cands = r.status === 'ambiguous' ? r.candidates : []
      reviewRows.push(
        [
          card.id,
          card.art_variant ?? '',
          card.rarity ?? '',
          r.status,
          key,
          cands.map((c) => c.productId).join(' | '),
          cands.map((c) => c.name).join(' | '),
          cands.map((c) => ext(c, 'Rarity') ?? '').join(' | '),
        ]
          .map(csvCell)
          .join(',')
      )
    }
  }

  // 4. Report
  const total = scoped.length
  const pct = (n: number) => (total ? ((n / total) * 100).toFixed(1) : '0') + '%'
  console.log('  ── results ─────────────────────────────')
  console.log(`  total cards   : ${total}`)
  console.log(`  ✓ matched     : ${matches.length}  (${pct(matches.length)})`)
  for (const [via, n] of Array.from(viaTally).sort((a, b) => b[1] - a[1])) {
    console.log(`      via ${via.padEnd(13)}: ${n}`)
  }
  console.log(`  ⚠ ambiguous   : ${ambiguous}  (${pct(ambiguous)})  → needs review`)
  console.log(`  ✗ unmatched   : ${unmatched}  (${pct(unmatched)})  → needs review`)

  if (reviewRows.length > 1) {
    writeFileSync(REVIEW_CSV, reviewRows.join('\n'))
    console.log(`\n  wrote ${reviewRows.length - 1} rows needing review → scripts/${REVIEW_CSV}`)
  } else {
    console.log('\n  nothing needs review — clean mapping 🎉')
  }

  // 5. Persist (only with --write)
  if (!WRITE) {
    console.log('\n  dry run — no DB writes. Re-run with --write to persist confident matches.\n')
    return
  }
  console.log(`\n  writing ${matches.length} matches to cards.tcgplayer_product_id…`)

  // Gentle concurrency + retry: a flaky connection or too many simultaneous
  // requests can throw "fetch failed", so cap parallelism low and retry each row.
  const CONCURRENCY = 10
  let written = 0
  let failed = 0
  const failures: string[] = []

  async function writeOne(m: { id: string; productId: number }): Promise<void> {
    let lastMsg = 'unknown'
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const { error } = await supabase.from('cards').update({ tcgplayer_product_id: m.productId }).eq('id', m.id)
        if (!error) {
          written++
          return
        }
        lastMsg = error.message
      } catch (e) {
        lastMsg = e instanceof Error ? e.message : String(e)
      }
      if (attempt < 4) await sleep(400 * attempt) // backoff: 0.4s, 0.8s, 1.2s
    }
    failed++
    failures.push(m.id)
    console.error(`    ✗ ${m.id}: ${lastMsg}`)
  }

  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < matches.length) {
      await writeOne(matches[cursor++])
      if ((written + failed) % 50 === 0) process.stdout.write(`\r  ${written + failed}/${matches.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  console.log(`\r  ${written + failed}/${matches.length}`)
  console.log(`  ✓ done — ${written} cards mapped${failed ? `, ✗ ${failed} failed (re-run to retry): ${failures.slice(0, 10).join(', ')}${failures.length > 10 ? '…' : ''}` : ''}.\n`)
}

main().catch((e) => {
  console.error('\n✗ mapping failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})
