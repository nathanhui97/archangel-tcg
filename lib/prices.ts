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
