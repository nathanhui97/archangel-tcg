/**
 * TCGplayer price sync (via tcgcsv.com) → card_prices + card_price_history.
 *
 * Pulls current market prices for every Gundam product we've mapped
 * (cards.tcgplayer_product_id, filled by map-tcgplayer-ids.ts) and:
 *   - upserts the latest snapshot into `card_prices`      (what the app reads)
 *   - appends a dated row to `card_price_history`         (powers the ± trend)
 *
 * tcgcsv refreshes once daily (~20:00 UTC); running more than once a day just
 * re-writes the same numbers (idempotent). Intended cadence: every 2 days.
 *
 * Prices are a SOFT reference (Near-Mint equivalent, Normal/Holofoil split).
 *
 * Run with:
 *   cd scripts && npm run sync:prices              # write current + history
 *   cd scripts && npm run sync:prices -- --dry-run # preview counts, no writes
 *   cd scripts && npm run sync:prices -- --sets=GD01,ST04
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      '  Set them in scripts/.env (local) or as CI env vars.'
  )
  process.exit(1)
}

const GUNDAM_CATEGORY_ID = 86
const TCGCSV_BASE = 'https://tcgcsv.com/tcgplayer'
const POLITE_DELAY_MS = 300
const USER_AGENT = 'Mozilla/5.0 Bindar-PriceSync (contact: github.com/nathanhui97/archangel-tcg)'

const DRY_RUN = process.argv.includes('--dry-run')
const ONLY_SETS = (() => {
  const a = process.argv.find((x) => x.startsWith('--sets='))
  return a ? new Set(a.split('=')[1].split(',').map((s) => s.toUpperCase())) : null
})()

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return (await res.json()) as T
}

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
type Group = { groupId: number; name: string; abbreviation?: string }
type PriceRow = {
  productId: number
  lowPrice: number | null
  midPrice: number | null
  highPrice: number | null
  marketPrice: number | null
  directLowPrice: number | null
  subTypeName: string
}
type Envelope<T> = { success?: boolean; results?: T[] }

// ─────────────────────────────────────────────────────────────────────────
// Which products do we care about? Only the ones mapped to our cards.
// ─────────────────────────────────────────────────────────────────────────
async function fetchMappedProductIds(): Promise<Set<number>> {
  const ids = new Set<number>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('cards')
      .select('tcgplayer_product_id')
      .eq('game', 'gundam')
      .not('tcgplayer_product_id', 'is', null)
      .order('tcgplayer_product_id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`fetch mapped ids → ${error.message}`)
    if (!data || data.length === 0) break
    for (const r of data) if (r.tcgplayer_product_id != null) ids.add(r.tcgplayer_product_id)
    if (data.length < PAGE) break
  }
  return ids
}

/** Chunked upsert with retry — gentle on flaky connections. */
async function upsertChunked(table: string, rows: Record<string, unknown>[], onConflict: string): Promise<number> {
  const CHUNK = 500
  let ok = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    let lastMsg = 'unknown'
    let done = false
    for (let attempt = 1; attempt <= 4 && !done; attempt++) {
      try {
        const { error } = await supabase.from(table).upsert(chunk, { onConflict })
        if (!error) {
          ok += chunk.length
          done = true
          break
        }
        lastMsg = error.message
      } catch (e) {
        lastMsg = e instanceof Error ? e.message : String(e)
      }
      if (attempt < 4) await sleep(400 * attempt)
    }
    if (!done) console.error(`    ✗ ${table} chunk ${i}-${i + chunk.length}: ${lastMsg}`)
    process.stdout.write(`\r  ${table}: ${ok}/${rows.length}`)
  }
  process.stdout.write('\n')
  return ok
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────
async function main() {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  console.log(`\n▸ Syncing TCGplayer prices (category ${GUNDAM_CATEGORY_ID}) — snapshot ${today}`)
  console.log(`  mode: ${DRY_RUN ? 'dry run (no writes)' : 'write'}`)
  if (ONLY_SETS) console.log(`  sets: ${Array.from(ONLY_SETS).join(', ')}`)

  const mapped = await fetchMappedProductIds()
  console.log(`  ${mapped.size} mapped products to price`)

  const groups = (await getJson<Envelope<Group>>(`${TCGCSV_BASE}/${GUNDAM_CATEGORY_ID}/groups`)).results ?? []
  const scopedGroups = ONLY_SETS ? groups.filter((g) => g.abbreviation && ONLY_SETS.has(g.abbreviation.toUpperCase())) : groups

  const priceRows: Record<string, unknown>[] = []
  const historyRows: Record<string, unknown>[] = []
  const pricedProducts = new Set<number>()

  for (const g of scopedGroups) {
    const rows = (await getJson<Envelope<PriceRow>>(`${TCGCSV_BASE}/${GUNDAM_CATEGORY_ID}/${g.groupId}/prices`)).results ?? []
    for (const p of rows) {
      if (!mapped.has(p.productId)) continue
      pricedProducts.add(p.productId)
      priceRows.push({
        tcgplayer_product_id: p.productId,
        sub_type: p.subTypeName || 'Normal',
        market: p.marketPrice,
        low: p.lowPrice,
        mid: p.midPrice,
        high: p.highPrice,
        direct_low: p.directLowPrice,
        updated_at: new Date().toISOString(),
      })
      historyRows.push({
        tcgplayer_product_id: p.productId,
        sub_type: p.subTypeName || 'Normal',
        snapshot_date: today,
        market: p.marketPrice,
        low: p.lowPrice,
        high: p.highPrice,
      })
    }
    await sleep(POLITE_DELAY_MS)
  }

  const withMarket = priceRows.filter((r) => r.market != null).length
  console.log('\n  ── collected ───────────────────────────')
  console.log(`  price rows      : ${priceRows.length}  (Normal + Holofoil sub-types)`)
  console.log(`  with a market $ : ${withMarket}  (${priceRows.length ? ((withMarket / priceRows.length) * 100).toFixed(1) : '0'}%)`)
  console.log(`  products priced : ${pricedProducts.size} / ${mapped.size} mapped`)
  console.log(`  no price found  : ${mapped.size - pricedProducts.size} products (→ "not available")`)

  if (DRY_RUN) {
    console.log('\n  dry run — no writes. Re-run without --dry-run to persist.\n')
    return
  }

  console.log('\n  writing…')
  const wroteCurrent = await upsertChunked('card_prices', priceRows, 'tcgplayer_product_id,sub_type')
  const wroteHistory = await upsertChunked('card_price_history', historyRows, 'tcgplayer_product_id,sub_type,snapshot_date')
  console.log(`\n  ✓ done — ${wroteCurrent} current prices, ${wroteHistory} history rows (snapshot ${today}).\n`)
}

main().catch((e) => {
  console.error('\n✗ sync failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})
