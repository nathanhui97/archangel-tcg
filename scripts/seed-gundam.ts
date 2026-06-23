/**
 * Gundam Card Game seed script.
 *
 * 1. Launches Puppeteer
 * 2. Visits gundam-gcg.com/en/cards/, iterates every set in the filter
 * 3. Extracts each card's metadata + image URL from the rendered DOM
 * 4. Downloads each image and uploads to Supabase Storage (`card-images`)
 * 5. Upserts the metadata + Supabase Storage URL into the `cards` table
 *
 * Run with:
 *   cd scripts && npm run seed:gundam
 *
 * Re-running is safe — every step is idempotent (upsert on conflict).
 * Selectors live in the SELECTORS object at the top; if Bandai changes
 * their site, adjust there.
 */

import 'dotenv/config'
import puppeteer, { type Page } from 'puppeteer'
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

const BASE_URL = 'https://www.gundam-gcg.com/en'
const CARDS_URL = `${BASE_URL}/cards/`
const BUCKET = 'card-images'
const POLITE_DELAY_MS = 800  // between image downloads

// Selectors — adjust here if Bandai changes their DOM
const SELECTORS = {
  setFilter: 'select[name="expansion"], select[name="product"]',
  searchButton: 'button[type="submit"], input[type="submit"]',
  resultList: '.cardlist, .card-list, .result-list, ul.cards',
  cardItem: '.cardlist li, .card-list .card, .result-list .item',
  // Per-card data (inside cardItem)
  cardCode:  '.cardCode, .code, [class*="code"]',
  cardName:  '.cardName, .name, [class*="name"]',
  cardImage: 'img',
  // Detail page (clicked per card if list view doesn't have full data)
  detailColor:   '[class*="color"]',
  detailRarity:  '[class*="rarity"]',
  detailType:    '[class*="type"]',
  detailCost:    '[class*="cost"]',
  detailLevel:   '[class*="level"], [class*="lv"]',
  detailAp:      '[class*="ap"]',
  detailHp:      '[class*="hp"]',
  detailEffect:  '[class*="effect"], [class*="text"]',
  detailSource:  '[class*="source"], [class*="title"]',
}

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

type ScrapedCard = {
  id: string
  name: string
  set_name: string | null
  set_code: string | null
  number: string | null
  card_type: string | null
  color: string | null
  rarity: string | null
  cost: number | null
  level: number | null
  ap: number | null
  hp: number | null
  link: string | null
  zone: string | null
  trait: string[] | null
  effect: string | null
  source_title: string | null
  imageOriginUrl: string  // gundam-gcg.com URL, before we re-host
}

// ─────────────────────────────────────────────────────────────────────────
// Supabase admin client (bypasses RLS)
// ─────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseSetCodeFromId(id: string): { setCode: string; number: string } | null {
  const m = id.match(/^([A-Z]+\d+)-(\d+)/i)
  if (!m) return null
  return { setCode: m[1].toUpperCase(), number: m[2] }
}

function toInt(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 ArchangelTCG-Seeder',
      Referer: BASE_URL,
    },
  })
  if (!res.ok) throw new Error(`Image fetch ${res.status} for ${url}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') ?? 'image/webp'
  return { buffer, contentType }
}

async function uploadImage(cardId: string, buffer: Buffer, contentType: string): Promise<string> {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'webp'
  const path = `${cardId}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
    cacheControl: '31536000',  // 1 year — card art is immutable
  })
  if (error) throw new Error(`Storage upload failed for ${cardId}: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function upsertCard(card: ScrapedCard, imageUrl: string) {
  const sc = parseSetCodeFromId(card.id)
  const { error } = await supabase.from('cards').upsert(
    {
      id: card.id,
      game: 'gundam',
      name: card.name,
      set_name: card.set_name,
      set_code: card.set_code ?? sc?.setCode ?? null,
      number: card.number ?? sc?.number ?? null,
      card_type: card.card_type,
      color: card.color,
      rarity: card.rarity,
      cost: card.cost,
      level: card.level,
      ap: card.ap,
      hp: card.hp,
      link: card.link,
      zone: card.zone,
      trait: card.trait,
      effect: card.effect,
      source_title: card.source_title,
      image_url: imageUrl,
    },
    { onConflict: 'id' }
  )
  if (error) throw new Error(`DB upsert failed for ${card.id}: ${error.message}`)
}

// ─────────────────────────────────────────────────────────────────────────
// Scraper
// ─────────────────────────────────────────────────────────────────────────

async function getSetList(page: Page): Promise<{ value: string; label: string }[]> {
  await page.goto(CARDS_URL, { waitUntil: 'networkidle2', timeout: 60_000 })

  return page.evaluate((selector) => {
    const select = document.querySelector(selector) as HTMLSelectElement | null
    if (!select) return []
    return Array.from(select.options)
      .map((o) => ({ value: o.value, label: (o.textContent ?? '').trim() }))
      .filter((o) => o.value && o.value !== '')
  }, SELECTORS.setFilter)
}

async function scrapeSet(page: Page, set: { value: string; label: string }): Promise<ScrapedCard[]> {
  console.log(`  ↳ Loading set: ${set.label}`)

  await page.goto(CARDS_URL, { waitUntil: 'networkidle2' })
  await page.select(SELECTORS.setFilter, set.value)

  // Submit the filter (the search button may be a form submit)
  const submit = await page.$(SELECTORS.searchButton)
  if (submit) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => undefined),
      submit.click(),
    ])
  } else {
    // SPA — wait for result re-render
    await sleep(1500)
  }

  // Wait for the result list to be present
  await page
    .waitForSelector(SELECTORS.cardItem, { timeout: 15_000 })
    .catch(() => console.warn(`    ⚠ No cards found in set ${set.label}`))

  const cards = await page.evaluate(
    (sels, setName, setValue) => {
      const items = Array.from(document.querySelectorAll(sels.cardItem))
      return items.map((el) => {
        const text = (q: string) =>
          (el.querySelector(q)?.textContent ?? '').trim() || null
        const img = el.querySelector(sels.cardImage) as HTMLImageElement | null
        const code = text(sels.cardCode)
        const name = text(sels.cardName)

        return {
          id: code ?? '',
          name: name ?? '',
          set_name: setName,
          set_code: setValue,
          number: null,
          card_type: text(sels.detailType),
          color: text(sels.detailColor),
          rarity: text(sels.detailRarity),
          cost: text(sels.detailCost),
          level: text(sels.detailLevel),
          ap: text(sels.detailAp),
          hp: text(sels.detailHp),
          link: null,
          zone: null,
          trait: null,
          effect: text(sels.detailEffect),
          source_title: text(sels.detailSource),
          imageOriginUrl: img?.src ?? '',
        }
      })
    },
    SELECTORS,
    set.label,
    set.value
  )

  // Coerce string fields → numbers where applicable, and filter junk
  return cards
    .filter((c) => c.id && c.name && c.imageOriginUrl)
    .map((c) => ({
      ...c,
      cost: toInt(c.cost as unknown as string),
      level: toInt(c.level as unknown as string),
      ap: toInt(c.ap as unknown as string),
      hp: toInt(c.hp as unknown as string),
    })) as ScrapedCard[]
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▶ Launching headless browser…')
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 ArchangelTCG-Seeder')
  await page.setViewport({ width: 1280, height: 1800 })

  try {
    console.log('▶ Discovering sets…')
    const sets = await getSetList(page)
    if (sets.length === 0) {
      console.error('✗ Could not find the set filter. Inspect the page and update SELECTORS.setFilter.')
      process.exit(1)
    }
    console.log(`  Found ${sets.length} sets`)

    let totalCards = 0
    let totalSkipped = 0

    for (const set of sets) {
      const cards = await scrapeSet(page, set)
      console.log(`  • Scraped ${cards.length} cards from ${set.label}`)

      for (const card of cards) {
        try {
          const { buffer, contentType } = await downloadImage(card.imageOriginUrl)
          const publicUrl = await uploadImage(card.id, buffer, contentType)
          await upsertCard(card, publicUrl)
          totalCards++
          if (totalCards % 25 === 0) {
            console.log(`    ✓ ${totalCards} cards uploaded so far…`)
          }
        } catch (err) {
          totalSkipped++
          console.warn(`    ⚠ Skipped ${card.id}: ${(err as Error).message}`)
        }
        await sleep(POLITE_DELAY_MS)  // be a polite scraper
      }
    }

    console.log(`\n✓ Done. Uploaded ${totalCards} cards. Skipped ${totalSkipped}.`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('✗ Seed failed:', err)
  process.exit(1)
})
