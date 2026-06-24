/**
 * Gundam Card Game seed script.
 *
 * The official site (gundam-gcg.com) looks like a JS SPA but is actually
 * a server-rendered PHP form. We:
 *   1. GET /en/cards/                              → discover all sets
 *   2. POST /en/cards/index.php (package=XXX)      → list card IDs in set
 *   3. GET /en/cards/detail.php?detailSearch=ID    → full card metadata
 *   4. GET /en/images/cards/card/ID.webp           → download image
 *   5. Upload image to Supabase Storage + upsert metadata
 *
 * Run with:
 *   cd scripts && npm install && npm run seed:gundam
 *
 * Re-running is safe — every step is upsert/idempotent.
 */

import 'dotenv/config'
import { load } from 'cheerio'
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

const BASE_URL = 'https://www.gundam-gcg.com'
const CARDS_PAGE = `${BASE_URL}/en/cards/`
const SEARCH_URL = `${BASE_URL}/en/cards/index.php`
const detailUrl = (id: string) => `${BASE_URL}/en/cards/detail.php?detailSearch=${encodeURIComponent(id)}`
const imageUrl  = (id: string) => `${BASE_URL}/en/images/cards/card/${encodeURIComponent(id)}.webp`

const BUCKET = 'card-images'
const POLITE_DELAY_MS = 400
const USER_AGENT = 'Mozilla/5.0 Bindar-Seeder (contact: github.com/nathanhui97/archangel-tcg)'

// CLI args:  --max=N (cap cards per set, useful for first-run smoke testing)
//            --sets=GD01,ST04 (only process these set codes)
const MAX_PER_SET = (() => {
  const a = process.argv.find((x) => x.startsWith('--max='))
  return a ? parseInt(a.split('=')[1], 10) : Infinity
})()
const ONLY_SETS = (() => {
  const a = process.argv.find((x) => x.startsWith('--sets='))
  return a ? new Set(a.split('=')[1].split(',').map((s) => s.toUpperCase())) : null
})()
const NEW_ONLY = process.argv.includes('--new-only')
const MISSING_ONLY = process.argv.includes('--missing-only')

async function setAlreadyImported(setCode: string | null): Promise<boolean> {
  if (!setCode) return false
  const { count, error } = await supabase
    .from('cards')
    .select('id', { count: 'exact', head: true })
    .eq('game', 'gundam')
    .eq('set_code', setCode)
  if (error) return false
  return (count ?? 0) > 0
}

async function existingIdsInSet(setCode: string | null): Promise<Set<string>> {
  if (!setCode) return new Set()
  const { data, error } = await supabase
    .from('cards')
    .select('id')
    .eq('game', 'gundam')
    .eq('set_code', setCode)
  if (error) return new Set()
  return new Set((data ?? []).map((r) => r.id))
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─────────────────────────────────────────────────────────────────────────
// HTTP helpers (with polite headers + rate limiting)
// ─────────────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const TRANSIENT_ERROR = /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network/i

/** Retry a network operation on transient failures (3 tries, linear backoff). */
async function withRetry<T>(fn: () => Promise<T>, label = ''): Promise<T> {
  const maxAttempts = 3
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const msg = (err as Error)?.message ?? String(err)
      if (!TRANSIENT_ERROR.test(msg) || attempt === maxAttempts) throw err
      const backoff = 1000 * attempt
      console.warn(`    ↻ ${label} retry ${attempt}/${maxAttempts - 1} after ${backoff}ms (${msg})`)
      await sleep(backoff)
    }
  }
  throw lastErr
}

async function getHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.text()
}

async function postForm(url: string, body: Record<string, string>): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  })
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}`)
  return res.text()
}

// ─────────────────────────────────────────────────────────────────────────
// Scraping
// ─────────────────────────────────────────────────────────────────────────

type SetEntry = { packageCode: string; label: string; setCode: string | null }

/** Discover every set from the filter UI on the cards index page. */
async function discoverSets(): Promise<SetEntry[]> {
  const html = await getHtml(CARDS_PAGE)
  const $ = load(html)

  const seen = new Set<string>()
  const sets: SetEntry[] = []

  // The filter has duplicate copies (header + sidebar) — dedupe by package code.
  $('.js-selectBtn-package').each((_, el) => {
    const $el = $(el)
    const packageCode = ($el.attr('data-val') ?? '').trim()
    const label = $el.text().trim()
    if (!packageCode || !label || label === 'ALL') return
    if (seen.has(packageCode)) return
    seen.add(packageCode)

    // Extract set code (in brackets) from labels like "Newtype Rising [GD01]"
    const m = label.match(/\[([^\]]+)\]/)
    sets.push({ packageCode, label, setCode: m?.[1] ?? null })
  })

  return sets
}

/** List every card ID inside a given set. */
async function listCardIdsInSet(packageCode: string): Promise<string[]> {
  const html = await postForm(SEARCH_URL, {
    package: packageCode,
    freeword: '',
    sort: '',
  })
  const $ = load(html)

  const ids = new Set<string>()
  $('.cardItem .cardStr').each((_, el) => {
    const dataSrc = $(el).attr('data-src') ?? ''
    const match = dataSrc.match(/detailSearch=([^&"]+)/)
    if (match) ids.add(decodeURIComponent(match[1]))
  })

  return Array.from(ids)
}

type CardDetail = {
  id: string
  name: string
  set_name: string | null
  set_code: string | null
  number: string | null         // just the digits, e.g. "001"
  art_variant: string | null    // null for base print; "p1", "p2" for alt arts
  base_card_id: string | null   // e.g. "GD01-001" — links alt arts to the base print
  card_type: string | null      // 'Unit' | 'Pilot' | 'Command' | 'Base' | 'Resource'
  color: string | null
  rarity: string | null
  cost: number | null
  level: number | null
  ap: number | null
  hp: number | null
  zone: string | null
  link: string | null
  trait: string[] | null
  effect: string | null
  source_title: string | null
}

const CARD_TYPE_MAP: Record<string, string> = {
  UNIT: 'Unit',
  PILOT: 'Pilot',
  COMMAND: 'Command',
  BASE: 'Base',
  RESOURCE: 'Resource',
}

function normalizeCardType(raw: string | undefined): string | null {
  if (!raw) return null
  const key = raw.trim().toUpperCase()
  return CARD_TYPE_MAP[key] ?? null
}

/** Split "GD01-001_p1" → { setCode: "GD01", number: "001", artVariant: "p1", baseId: "GD01-001" }. */
function parseCardId(id: string): {
  setCode: string | null
  number: string | null
  artVariant: string | null
  baseId: string | null
} {
  const m = id.match(/^([A-Z0-9]+)-(\d+)(?:_(.+))?$/i)
  if (!m) return { setCode: null, number: null, artVariant: null, baseId: null }
  const [, setCode, number, artVariant] = m
  return {
    setCode: setCode.toUpperCase(),
    number,
    artVariant: artVariant ?? null,
    baseId: `${setCode.toUpperCase()}-${number}`,
  }
}

function toInt(s: string | undefined): number | null {
  if (!s) return null
  const n = parseInt(s.replace(/[^0-9-]/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function parseTraits(raw: string | undefined): string[] | null {
  if (!raw) return null
  const matches = raw.match(/\(([^)]+)\)/g)
  if (!matches) return raw.trim() ? [raw.trim()] : null
  return matches.map((m) => m.slice(1, -1).trim())
}

/** Fetch full card metadata from the detail page. */
async function fetchCardDetail(id: string): Promise<CardDetail> {
  const html = await getHtml(detailUrl(id))
  const $ = load(html)

  const name = $('.cardName').first().text().trim()
  const rarity = $('.rarity').first().text().trim() || null

  // Build a label → value map from the .dataBox dl pairs
  const data: Record<string, string> = {}
  $('.dataBox').each((_, el) => {
    const label = $(el).find('.dataTit').text().trim()
    const value = $(el).find('.dataTxt').text().trim()
    if (label) data[label] = value
  })

  // Effect text lives in the "overview" row (not inside a .dataBox)
  const effectHtml = $('.cardDataRow.overview .dataTxt').html() ?? ''
  const effect = effectHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim() || null

  // "Where to get it" gives e.g. "Newtype Rising [GD01]"
  const whereRaw = data['Where to get it'] ?? ''
  const whereMatch = whereRaw.match(/^(.+?)\s*\[([^\]]+)\]\s*$/)
  const setNameFromDetail = whereMatch?.[1]?.trim() ?? (whereRaw || null)
  const setCodeFromDetail = whereMatch?.[2]?.trim() ?? null

  // Parse the ID itself: set code + number + alt-art variant
  const parsed = parseCardId(id)

  return {
    id,
    name,
    set_name: setNameFromDetail,
    set_code: setCodeFromDetail ?? parsed.setCode,
    number: parsed.number,
    art_variant: parsed.artVariant,
    base_card_id: parsed.baseId,
    card_type: normalizeCardType(data['TYPE'] ?? data['Type']),
    color: data['COLOR'] || data['Color'] || null,
    rarity,
    cost: toInt(data['COST'] ?? data['Cost']),
    level: toInt(data['Lv.'] ?? data['LV.'] ?? data['Lv']),
    ap: toInt(data['AP']),
    hp: toInt(data['HP']),
    zone: data['Zone'] || null,
    link: data['Link'] || null,
    trait: parseTraits(data['Trait']),
    effect,
    source_title: data['Source Title'] || null,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Image + DB
// ─────────────────────────────────────────────────────────────────────────

async function uploadImage(id: string): Promise<string> {
  const buffer = await withRetry(async () => {
    const res = await fetch(imageUrl(id), {
      headers: { 'User-Agent': USER_AGENT, Referer: CARDS_PAGE },
    })
    if (!res.ok) throw new Error(`image GET → ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }, `${id} image fetch`)

  const path = `${id}.webp`
  await withRetry(async () => {
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '31536000',
    })
    if (error) throw new Error(`storage upload → ${error.message}`)
  }, `${id} storage upload`)

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

async function upsertCard(detail: CardDetail, imageUrl: string) {
  await withRetry(async () => {
    const { error } = await supabase
      .from('cards')
      .upsert({ game: 'gundam', ...detail, image_url: imageUrl }, { onConflict: 'id' })
    if (error) throw new Error(`db upsert → ${error.message}`)
  }, `${detail.id} db upsert`)
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▶ Discovering sets…')
  const sets = await discoverSets()
  console.log(`  Found ${sets.length} sets`)

  let totalOk = 0
  let totalSkipped = 0

  for (const set of sets) {
    if (ONLY_SETS && set.setCode && !ONLY_SETS.has(set.setCode.toUpperCase())) {
      console.log(`\n· Skipping ${set.label} (not in --sets filter)`)
      continue
    }
    if (NEW_ONLY && (await setAlreadyImported(set.setCode))) {
      console.log(`\n· Skipping ${set.label} (--new-only: already imported)`)
      continue
    }
    console.log(`\n▶ ${set.label} (package ${set.packageCode})`)
    const allIds = await listCardIdsInSet(set.packageCode)

    let filteredIds = allIds
    if (MISSING_ONLY) {
      const existing = await existingIdsInSet(set.setCode)
      filteredIds = allIds.filter((id) => !existing.has(id))
      console.log(`  ${filteredIds.length} missing of ${allIds.length} (${allIds.length - filteredIds.length} already in DB)`)
      if (filteredIds.length === 0) continue
    }

    const ids = Number.isFinite(MAX_PER_SET) ? filteredIds.slice(0, MAX_PER_SET) : filteredIds
    if (!MISSING_ONLY) {
      console.log(`  ${ids.length} cards${allIds.length > ids.length ? ` (capped from ${allIds.length} by --max)` : ''}`)
    }

    for (const id of ids) {
      try {
        const detail = await fetchCardDetail(id)
        const url = await uploadImage(id)
        await upsertCard(detail, url)
        totalOk++
        if (totalOk % 25 === 0) console.log(`  ✓ ${totalOk} cards uploaded`)
      } catch (err) {
        totalSkipped++
        console.warn(`  ⚠ ${id}: ${(err as Error).message}`)
      }
      await sleep(POLITE_DELAY_MS)
    }
  }

  console.log(`\n✓ Done. Uploaded ${totalOk}. Skipped ${totalSkipped}.`)
}

main().catch((err) => {
  console.error('✗ Seed failed:', err)
  process.exit(1)
})
