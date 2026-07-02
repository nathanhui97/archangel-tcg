import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type LeaderboardMetric = 'value' | 'alt' | 'count'

export type LeaderboardEntry = {
  rank: number
  user_id: string
  handle: string
  verified_at: string | null
  score: number
}

/** Ranked collectors in a city (verified public binders), by value or alt count.
 *  Also surfaces the current user's own rank (or null if they're not on it). */
export function useCityLeaderboard(city: string | null | undefined, metric: LeaderboardMetric) {
  const [rows, setRows] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!city) {
      setRows([])
      setMyRank(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase.rpc('get_city_leaderboard', { p_city: city, p_metric: metric })
    if (e) {
      setError(e.message)
      setRows([])
      setMyRank(null)
      setLoading(false)
      return
    }
    const list = (data ?? []).map((r: { rank: number; user_id: string; handle: string; verified_at: string | null; score: number }) => ({
      rank: Number(r.rank),
      user_id: r.user_id,
      handle: r.handle,
      verified_at: r.verified_at,
      score: Number(r.score),
    })) as LeaderboardEntry[]
    setRows(list)

    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    setMyRank(uid ? list.find((r) => r.user_id === uid) ?? null : null)
    setLoading(false)
  }, [city, metric])

  useEffect(() => {
    load()
  }, [load])

  return { rows, myRank, loading, error, refresh: load }
}

export type LeaderboardCity = { city: string; collectors: number }

/** Cities that have a leaderboard (for the city picker). */
export function useLeaderboardCities() {
  const [cities, setCities] = useState<LeaderboardCity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.rpc('get_leaderboard_cities').then(({ data }) => {
      if (!active) return
      setCities((data ?? []) as LeaderboardCity[])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  return { cities, loading }
}
