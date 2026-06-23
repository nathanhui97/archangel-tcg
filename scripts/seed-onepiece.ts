/**
 * One Piece Card Game seed script.
 *
 * Like the Gundam site, `en.onepiece-cardgame.com` is a server-rendered
 * PHP form — but it's even simpler because the listing page already
 * contains all card details inline (no per-card detail page needed).
 *
 *   1. GET /cardlist/                          → discover sets from <select>
 *   2. POST /cardlist/ with series=XXX         → full HTML with every card's data
 *   3. Parse each <dl class="modalCol"> for metadata + image URL
 *   4. Download image, upload to Supabase Storage, upsert metadata
 *
 * Run with:
 *   cd scripts && npm install && npm run seed:onepiece
 *
 * Flags:
 *   --max=N         cap cards per set (smoke testing)
 *   --sets=OP01,ST05 only process these set codes
 *   --new-only      skip sets that already have cards in the DB
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

const BASE_URL = 'https://en.onepiece-cardgame.com'
const CARDS_URL = `${BASE_URL}/cardlist/`
const imageUrl = (id: string) => `${BASE_URL}/images/cardlist/card/${encodeURIComponent(id)}.png`

const BUCKET = 'card-images'
const POLITE_DELAY_MS = 300
const USER_AGENT = 'Mozilla/5.0 ArchangelTCG-Seeder (contact: github.com/nathanhui97/archangel-tcg)'

// CLI flags
const MAX_PER_SET = (() => {
  const a = process.argv.find((x) => x.startsWith('--max='))
  return a ? parseInt(a.split('=')[1], 10) : Infinity
})()
const ONLY_SETS = (() => {
  const a = process.argv.find((x) => x.startsWith('--sets='))
  return a ? new Set(a.split('=')[1].split(',').map((s) => s.toUpperCase())) : null
})()
const NEW_ONLY = process.argv.includes('--new-only')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

function toInt(s: string | undefined | null): number | null {
  if (!s) return null
  const cleaned = s.replace(/[^0-9-]/g, '')
  if (!cleaned || cleaned === '-') return null
  const n = parseInt(cleaned, 10)
  return Number.isFinite(n) ? n : null
}

const CARD_TYPE_MAP: Record<string, string> = {
  LEADER: 'Leader',
  CHARACTER: 'Character',
  EVENT: 'Event',
  STAGE: 'Stage',
  'DON!!': 'DON!!',
  DON: 'DON!!',
}

function normalizeCardType(raw: string | undefined): string | null {
  if (!raw) return null
  const key = raw.trim().toUpperCase()
  return CARD_TYPE_MAP[key] ?? null
}

/** Split "OP01-001_p1" → setCode/number/artVariant/baseId. */
function parseCardId(id: string) {
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

// ─────────────────────────────────────────────────────────────────────────
// Scrape
// ─────────────────────────────────────────────────────────────────────────

type SetEntry = { seriesValue: string; label: string; setCode: string | null }

async function discoverSets(): Promise<SetEntry[]> {
  const html = await getHtml(CARDS_URL)
  const $ = load(html)
  const sets: SetEntry[] = []

  $('select[name="series"] option').each((_, el) => {
    const seriesValue = ($(el).attr('value') ?? '').trim()
    // Strip embedded <br class="spInline"> from the label text
    const rawLabel = $(el).text().replace(/\s+/g, ' ').trim()
    if (!seriesValue || !rawLabel || rawLabel === 'ALL' || rawLabel === 'Recording') return

    const bracketMatch = rawLabel.match(/\[([^\]]+)\]\s*$/)
    const setCode = bracketMatch ? bracketMatch[1].replace(/-/g, '').toUpperCase() : null
    sets.push({ seriesValue, label: rawLabel, setCode })
  })

  return sets
}

type ParsedCard = {
  id: string
  name: string
  set_name: string | null
  set_code: string | null
  number: string | null
  art_variant: string | null
  base_card_id: string | null
  card_type: string | null
  color: string | null
  rarity: string | null
  cost: number | null
  power: number | null
  counter: number | null
  life: number | null
  attribute: string | null
  block: string | null
  trait: string[] | null
  effect: string | null
  source_title: string | null
  image_path: string  // /images/cardlist/card/OP01-001.png (relative)
}

async function scrapeSet(set: SetEntry): Promise<ParsedCard[]> {
  const html = await postForm(CARDS_URL, {
    series: set.seriesValue,
    freewords: '',
  })
  const $ = load(html)
  const cards: ParsedCard[] = []

  $('dl.modalCol').each((_, el) => {
    const $el = $(el)
    const id = ($el.attr('id') ?? '').trim()
    if (!id) return

    // Card name from <div class="cardName">
    const name = $el.find('.cardName').first().text().trim()

    // Rarity & type come from <div class="infoCol"><span>code</span> | <span>rarity</span> | <span>type</span>
    const infoSpans = $el
      .find('.infoCol span')
      .map((_, s) => $(s).text().trim())
      .get()
    const rarity = infoSpans[1] ?? null
    const cardType = normalizeCardType(infoSpans[2])

    // Image
    const img = $el.find('.frontCol img').first().attr('data-src') ?? ''
    if (!img) return

    // Helper: read a labelled field like <div class="cost"><h3>Cost</h3>5</div>
    const readField = (cls: string): string | null => {
      const div = $el.find(`.backCol .${cls}`).first()
      if (div.length === 0) return null
      const h3 = div.find('h3').first()
      h3.remove()
      const text = div.text().trim()
      return text || null
    }

    const costRaw = readField('cost')
    // Leader cards expose "Life" in the cost slot — detect by card type
    const isLeader = cardType === 'Leader'

    const colorRaw = readField('color')
    const featureRaw = readField('feature')
    const effectRaw = readField('text')
    const sourceRaw = readField('getInfo')

    // "Card Set(s)" looks like: "-THE TIME OF BATTLE- [OP-16]"
    let sourceTitle: string | null = null
    let setCodeFromSource: string | null = null
    if (sourceRaw) {
      const m = sourceRaw.match(/^-?(.+?)-?\s*\[([^\]]+)\]\s*$/)
      if (m) {
        sourceTitle = m[1].trim()
        setCodeFromSource = m[2].replace(/-/g, '').toUpperCase()
      } else {
        sourceTitle = sourceRaw
      }
    }

    const parsed = parseCardId(id)

    cards.push({
      id,
      name,
      set_name: sourceTitle,
      set_code: parsed.setCode ?? setCodeFromSource ?? set.setCode,
      number: parsed.number,
      art_variant: parsed.artVariant,
      base_card_id: parsed.baseId,
      card_type: cardType,
      color: colorRaw,
      rarity,
      cost: isLeader ? null : toInt(costRaw),
      life: isLeader ? toInt(costRaw) : null,
      power: toInt(readField('power')),
      counter: toInt(readField('counter')),
      attribute: $el.find('.attribute i').first().text().trim() || null,
      block: readField('block'),
      trait: featureRaw ? featureRaw.split('/').map((t) => t.trim()).filter(Boolean) : null,
      effect: effectRaw,
      source_title: null,
      image_path: img,
    })
  })

  return cards
}

// ─────────────────────────────────────────────────────────────────────────
// Image + DB
// ─────────────────────────────────────────────────────────────────────────

async function uploadImage(id: string): Promise<string> {
  const buffer = await withRetry(async () => {
    const res = await fetch(imageUrl(id), {
      headers: { 'User-Agent': USER_AGENT, Referer: CARDS_URL },
    })
    if (!res.ok) throw new Error(`image GET → ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }, `${id} image fetch`)

  const path = `${id}.png`
  await withRetry(async () => {
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '31536000',
    })
    if (error) throw new Error(`storage upload → ${error.message}`)
  }, `${id} storage upload`)

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

async function upsertCard(card: ParsedCard, imageUrl: string) {
  const { image_path, ...row } = card
  await withRetry(async () => {
    const { error } = await supabase
      .from('cards')
      .upsert({ game: 'one_piece', ...row, image_url: imageUrl }, { onConflict: 'id' })
    if (error) throw new Error(`db upsert → ${error.message}`)
  }, `${card.id} db upsert`)
}

async function setAlreadyImported(setCode: string | null): Promise<boolean> {
  if (!setCode) return false
  const { count, error } = await supabase
    .from('cards')
    .select('id', { count: 'exact', head: true })
    .eq('game', 'one_piece')
    .eq('set_code', setCode)
  if (error) return false
  return (count ?? 0) > 0
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▶ Discovering One Piece sets…')
  const sets = await discoverSets()
  console.log(`  Found ${sets.length} sets`)

  let totalOk = 0
  let totalSkipped = 0

  for (const set of sets) {
    if (ONLY_SETS && set.setCode && !ONLY_SETS.has(set.setCode)) {
      console.log(`\n· Skipping ${set.label} (not in --sets filter)`)
      continue
    }
    if (NEW_ONLY && (await setAlreadyImported(set.setCode))) {
      console.log(`\n· Skipping ${set.label} (--new-only: already imported)`)
      continue
    }

    console.log(`\n▶ ${set.label} (series ${set.seriesValue})`)
    const cards = await scrapeSet(set)
    const limited = Number.isFinite(MAX_PER_SET) ? cards.slice(0, MAX_PER_SET) : cards
    console.log(`  ${limited.length} cards${cards.length > limited.length ? ` (capped from ${cards.length})` : ''}`)

    for (const card of limited) {
      try {
        const url = await uploadImage(card.id)
        await upsertCard(card, url)
        totalOk++
        if (totalOk % 25 === 0) console.log(`  ✓ ${totalOk} cards uploaded`)
      } catch (err) {
        totalSkipped++
        console.warn(`  ⚠ ${card.id}: ${(err as Error).message}`)
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
