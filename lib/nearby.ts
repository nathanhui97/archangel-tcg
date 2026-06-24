import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Game, NearbyCard, NearbyWantlistItem } from '@/types'

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
      setCards((data ?? []) as NearbyCard[])
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
      setItems((data ?? []) as NearbyWantlistItem[])
    }
    setLoading(false)
  }, [lat, lng, radiusKm, game])

  useEffect(() => {
    load()
  }, [load])

  return { items, loading, error, refresh: load }
}
