import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Game, NearbyCard, NearbyWantlistItem, NearbyBinder } from '@/types'

/** Public binders from nearby traders (or shippers), for the Social tab. */
export function useNearbyBinders(lat: number | null, lng: number | null, radiusKm: number) {
  const [binders, setBinders] = useState<NearbyBinder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('get_nearby_binders', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
    })
    if (rpcError) {
      setError(rpcError.message)
      setBinders([])
    } else {
      // PostgREST returns numeric columns as strings — coerce for the UI.
      setBinders(
        ((data ?? []) as NearbyBinder[]).map((b) => ({
          ...b,
          total_value: b.total_value == null ? null : Number(b.total_value),
          distance_km: b.distance_km == null ? null : Number(b.distance_km),
        }))
      )
    }
    setLoading(false)
  }, [lat, lng, radiusKm])

  useEffect(() => {
    load()
  }, [load])

  return { binders, loading, error, refresh: load }
}

/**
 * The nearby RPCs don't return card attributes, so we fetch rarity/color/type
 * for the returned cards in one extra query and merge them in — enough to drive
 * the Trade-tab filters without changing the RPC.
 */
async function enrichWithCardAttrs<T extends { card_id: string }>(rows: T[]): Promise<T[]> {
  const ids = Array.from(new Set(rows.map((r) => r.card_id)))
  if (ids.length === 0) return rows
  const { data } = await supabase
    .from('cards')
    .select('id, rarity, color, card_type, is_alt_art')
    .in('id', ids)
  const map = new Map((data ?? []).map((c) => [c.id, c]))
  return rows.map((r) => {
    const c = map.get(r.card_id)
    return {
      ...r,
      card_rarity: c?.rarity ?? null,
      card_color: c?.color ?? null,
      card_type: c?.card_type ?? null,
      card_is_alt_art: c?.is_alt_art ?? false,
    }
  })
}

export function useNearbyCards(
  lat: number | null,
  lng: number | null,
  radiusKm: number,
  game: Game | null
) {
  const [cards, setCards] = useState<NearbyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('get_nearby_cards', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_game: game,
    })
    if (rpcError) {
      setError(rpcError.message)
      setCards([])
    } else {
      setCards(await enrichWithCardAttrs((data ?? []) as NearbyCard[]))
    }
    setLoading(false)
  }, [lat, lng, radiusKm, game])

  useEffect(() => {
    load()
  }, [load])

  return { cards, loading, error, refresh: load }
}

export function useNearbyWantlists(
  lat: number | null,
  lng: number | null,
  radiusKm: number,
  game: Game | null
) {
  const [items, setItems] = useState<NearbyWantlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('get_nearby_wantlists', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_game: game,
    })
    if (rpcError) {
      setError(rpcError.message)
      setItems([])
    } else {
      setItems(await enrichWithCardAttrs((data ?? []) as NearbyWantlistItem[]))
    }
    setLoading(false)
  }, [lat, lng, radiusKm, game])

  useEffect(() => {
    load()
  }, [load])

  return { items, loading, error, refresh: load }
}
