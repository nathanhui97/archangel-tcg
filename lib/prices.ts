import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * Soft TCGplayer market-price reference for a card (Near-Mint equivalent,
 * sourced via tcgcsv, refreshed every ~2 days). Deliberately simple: it returns
 * a price only when it's trustworthy, and null otherwise — so the UI shows a
 * number or shows nothing, never a misleading one.
 */
export type CardPrice = { market: number; subType: string }

export function useCardPrice(productId: number | null | undefined) {
  const [price, setPrice] = useState<CardPrice | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (productId == null) {
      setPrice(null)
      return
    }
    setLoading(true)
    supabase
      .from('card_prices')
      .select('sub_type, market, low')
      .eq('tcgplayer_product_id', productId)
      .then(({ data }) => {
        if (!active) return
        setLoading(false)
        const rows = data ?? []
        // Prefer a Normal print, else any sub-type that has a market price.
        const pick =
          rows.find((r) => r.sub_type === 'Normal' && r.market != null) ??
          rows.find((r) => r.market != null) ??
          null
        const market = pick?.market != null ? Number(pick.market) : null
        const low = pick?.low != null ? Number(pick.low) : null
        // Guard: no market → nothing. Listings sitting far above market means
        // the market figure rests on thin sales data → don't show it.
        if (pick == null || market == null || !Number.isFinite(market) || market <= 0) {
          setPrice(null)
          return
        }
        if (low != null && low > market * 2) {
          setPrice(null)
          return
        }
        setPrice({ market, subType: pick.sub_type })
      })
    return () => {
      active = false
    }
  }, [productId])

  return { price, loading }
}

/** "$2.60" for cents-level cards, "$746" once it's into whole dollars. */
export function formatPrice(n: number): string {
  return n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`
}

type ValueItem = { card?: { tcgplayer_product_id?: number | null } | null; quantity: number; is_foil: boolean }

/**
 * Estimated combined market value of a set of binder items — Σ(market × qty),
 * using the Holofoil price for foils and Normal otherwise. `priced`/`total`
 * counts let the UI note when some cards had no price.
 */
export function useBinderValue(items: ValueItem[]) {
  const [value, setValue] = useState<number | null>(null)
  const [priced, setPriced] = useState(0)
  const [totalQty, setTotalQty] = useState(0)

  const key = items.map((i) => `${i.card?.tcgplayer_product_id ?? '-'}x${i.quantity}${i.is_foil ? 'f' : ''}`).join(',')

  useEffect(() => {
    let active = true
    const productIds = Array.from(
      new Set(items.map((i) => i.card?.tcgplayer_product_id).filter((x): x is number => x != null))
    )
    const qty = items.reduce((n, i) => n + (i.quantity || 1), 0)
    setTotalQty(qty)
    if (productIds.length === 0) {
      setValue(0)
      setPriced(0)
      return
    }
    supabase
      .from('card_prices')
      .select('tcgplayer_product_id, sub_type, market')
      .in('tcgplayer_product_id', productIds)
      .then(({ data }) => {
        if (!active) return
        const map = new Map<string, number>()
        for (const r of data ?? []) if (r.market != null) map.set(`${r.tcgplayer_product_id}:${r.sub_type}`, Number(r.market))
        let sum = 0
        let n = 0
        for (const it of items) {
          const pid = it.card?.tcgplayer_product_id
          if (pid == null) continue
          const m =
            map.get(`${pid}:${it.is_foil ? 'Holofoil' : 'Normal'}`) ??
            map.get(`${pid}:Normal`) ??
            map.get(`${pid}:Holofoil`)
          if (m != null) {
            sum += m * (it.quantity || 1)
            n += it.quantity || 1
          }
        }
        setValue(sum)
        setPriced(n)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { value, priced, totalQty }
}
