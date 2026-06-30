import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Card } from '@/types'

type SearchOptions = {
  /** Game to filter by. Pass `null` to search across all TCGs (people mix). */
  game?: string | null
  setCode?: string | null
  color?: string | null
  cardType?: string | null
  /** Show only alt-art prints (art_variant is not null). */
  altArtOnly?: boolean
  limit?: number
}

/**
 * Search the `cards` catalog with a debounced query.
 *
 * - Empty query returns the newest cards (browse mode).
 * - Non-empty query does a prefix + substring ILIKE match on `name`.
 *   The pg_trgm GIN index keeps this fast even with 1000s of cards.
 */
export function useCardSearch(query: string, options: SearchOptions = {}) {
  const {
    game = 'gundam',
    setCode = null,
    color = null,
    cardType = null,
    altArtOnly = false,
    limit = 30,
  } = options

  const [results, setResults] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current
      setLoading(true)
      setError(null)

      // Display order: alt-arts first, then highest rarity, then newest set —
      // leads with the "chase" cards so picking feels exciting. (migration 0022)
      let q = supabase
        .from('cards')
        .select('*')
        .order('is_alt_art', { ascending: false })
        .order('rarity_rank', { ascending: false })
        .order('set_code', { ascending: false })
        .order('number', { ascending: true })
        .limit(limit)

      // game === null → search across all TCGs (mixed binders)
      if (game) q = q.eq('game', game)

      const trimmed = query.trim()
      if (trimmed) {
        // Match anywhere in the name OR exact code match.
        q = q.or(`name.ilike.%${trimmed}%,id.ilike.${trimmed}%`)
      }
      if (setCode) q = q.eq('set_code', setCode)
      if (color) q = q.eq('color', color)
      if (cardType) q = q.eq('card_type', cardType)
      if (altArtOnly) q = q.eq('is_alt_art', true)

      const { data, error: sbError } = await q

      // Ignore late responses from older queries
      if (requestId !== requestIdRef.current) return

      setLoading(false)
      if (sbError) {
        setError(sbError.message)
        setResults([])
      } else {
        setResults((data ?? []) as Card[])
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, game, setCode, color, cardType, altArtOnly, limit])

  return { results, loading, error }
}

/** Fetch a single card by its full id (e.g. "GD01-001"). */
export function useCard(id: string | undefined) {
  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!id) return
    setLoading(true)
    supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setCard((data ?? null) as Card | null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  return { card, loading }
}

/** Distinct values for the filter dropdowns. */
export async function fetchCardFacets(game = 'gundam'): Promise<{
  sets: { code: string; name: string }[]
  colors: string[]
  cardTypes: string[]
}> {
  const { data, error } = await supabase
    .from('cards')
    .select('set_code, set_name, color, card_type')
    .eq('game', game)

  if (error || !data) return { sets: [], colors: [], cardTypes: [] }

  const setMap = new Map<string, string>()
  const colors = new Set<string>()
  const types = new Set<string>()

  for (const row of data) {
    if (row.set_code) setMap.set(row.set_code, row.set_name ?? row.set_code)
    if (row.color) colors.add(row.color)
    if (row.card_type) types.add(row.card_type)
  }

  return {
    sets: Array.from(setMap, ([code, name]) => ({ code, name })).sort((a, b) =>
      b.code.localeCompare(a.code)
    ),
    colors: Array.from(colors).sort(),
    cardTypes: Array.from(types).sort(),
  }
}
