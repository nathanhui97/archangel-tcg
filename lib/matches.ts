import { useMemo } from 'react'
import { useNearbyCards, useNearbyWantlists } from './nearby'
import { useMyPublicCards } from './binders'
import { useMyWantlist } from './wantlist'
import type { NearbyCard, NearbyWantlistItem } from '@/types'

export type Match = {
  handle: string
  distance_km: number | null
  ships: boolean
  /** Their cards that are on YOUR wantlist (you'd receive). */
  youGet: NearbyCard[]
  /** Their wants that are in YOUR public binders (you'd give). */
  youGive: NearbyWantlistItem[]
  /** 1–3 match strength (3 = mutual overlap). */
  strength: number
}

/**
 * Compute trade matches near a location: other traders whose public cards are on
 * your wantlist, and/or whose wantlists include cards in your public binders.
 */
export function useMatches(lat: number | null, lng: number | null, radiusKm: number) {
  const { cards, loading: l1, refresh: r1 } = useNearbyCards(lat, lng, radiusKm, null)
  const { items: wants, loading: l2, refresh: r2 } = useNearbyWantlists(lat, lng, radiusKm, null)
  const { cards: myPublic, refresh: r3 } = useMyPublicCards()
  const { cardIds: myWantIds, refresh: r4 } = useMyWantlist()

  const matches = useMemo(() => {
    const myCardIds = new Set(myPublic.map((c) => c.card_id))
    const map = new Map<string, Match>()
    const get = (handle: string, dist: number | null, ships: boolean) => {
      let m = map.get(handle)
      if (!m) {
        m = { handle, distance_km: dist, ships, youGet: [], youGive: [], strength: 0 }
        map.set(handle, m)
      }
      if (m.distance_km === null && dist !== null) m.distance_km = dist
      if (ships) m.ships = true
      return m
    }

    for (const c of cards) {
      if (myWantIds.has(c.card_id)) get(c.owner_handle, c.distance_km, c.owner_willing_to_ship).youGet.push(c)
    }
    for (const w of wants) {
      if (myCardIds.has(w.card_id)) get(w.wanter_handle, w.distance_km, false).youGive.push(w)
    }

    const list = Array.from(map.values()).filter((m) => m.youGet.length > 0 || m.youGive.length > 0)
    for (const m of list) {
      const both = m.youGet.length > 0 && m.youGive.length > 0
      const total = m.youGet.length + m.youGive.length
      m.strength = both ? 3 : total >= 2 ? 2 : 1
    }
    list.sort((a, b) => b.strength - a.strength || (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9))
    return list
  }, [cards, wants, myPublic, myWantIds])

  return { matches, loading: l1 || l2, refresh: () => { r1(); r2(); r3(); r4() } }
}
