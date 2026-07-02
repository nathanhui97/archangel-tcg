import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { PullVisibility, ReactionKind } from '@/types'

const BUCKET = 'pull-photos'

/** Upload a local camera photo to the user's folder in pull-photos; returns the storage path. */
async function uploadPullPhoto(userId: string, uri: string): Promise<string> {
  const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase()
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  const path = `${userId}/${Date.now()}.${ext}`
  // RN-friendly: read the file:// uri as an ArrayBuffer (no extra native deps).
  const arraybuffer = await fetch(uri).then((r) => r.arrayBuffer())
  const { error } = await supabase.storage.from(BUCKET).upload(path, arraybuffer, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(`photo upload → ${error.message}`)
  return path
}

/**
 * After adding cards, find the most "notable" one worth nudging a share for —
 * an alt-art or a rare (R+). Bulk/commons return null so we never spam the feed.
 */
export type NotableCard = {
  id: string
  name: string
  image_url: string | null
  is_alt_art: boolean
  rarity: string | null
}

export async function pickNotableCard(cardIds: string[]): Promise<NotableCard | null> {
  const ids = Array.from(new Set(cardIds))
  if (ids.length === 0) return null
  const { data } = await supabase
    .from('cards')
    .select('id, name, image_url, is_alt_art, rarity, rarity_rank')
    .in('id', ids)
  const notable = (data ?? [])
    .filter((c) => c.is_alt_art || (c.rarity_rank ?? 0) >= 4) // alt art, or Rare and up
    .sort(
      (a, b) => (b.rarity_rank ?? 0) - (a.rarity_rank ?? 0) || Number(!!b.is_alt_art) - Number(!!a.is_alt_art)
    )[0]
  return notable
    ? { id: notable.id, name: notable.name, image_url: notable.image_url, is_alt_art: !!notable.is_alt_art, rarity: notable.rarity }
    : null
}

export async function createPull(input: {
  userId: string
  cardId: string
  binderItemId?: string | null
  photoUri?: string | null
  caption?: string | null
  isPull: boolean
  visibility: PullVisibility
}): Promise<void> {
  let photo_path: string | null = null
  if (input.photoUri) photo_path = await uploadPullPhoto(input.userId, input.photoUri)

  const { error } = await supabase.from('pulls').insert({
    user_id: input.userId,
    card_id: input.cardId,
    binder_item_id: input.binderItemId ?? null,
    photo_path,
    caption: input.caption?.trim() || null,
    is_pull: input.isPull,
    visibility: input.visibility,
  })
  if (error) throw new Error(`create pull → ${error.message}`)
}

// ── Feed ────────────────────────────────────────────────────────────────
export type FeedPull = {
  id: string
  user_id: string
  card_id: string
  caption: string | null
  is_pull: boolean
  verified_at: string | null
  created_at: string
  owner_handle: string
  owner_verified_at: string | null
  card_name: string
  card_image_url: string | null
  card_rarity: string | null
  card_is_alt_art: boolean
  card_market: number | null
  fire_count: number
  heart_count: number
  want_count: number
}

/** The pull feed: public + own pulls, newest first, with reaction counts and
 *  which reactions the current user has left. */
export function useFeed() {
  const [pulls, setPulls] = useState<FeedPull[]>([])
  const [mine, setMine] = useState<Record<string, Set<ReactionKind>>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('pull_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (e) {
      setError(e.message)
      setPulls([])
      setLoading(false)
      return
    }
    const rows = (data ?? []) as FeedPull[]
    setPulls(rows)

    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (uid && rows.length) {
      const { data: rx } = await supabase
        .from('pull_reactions')
        .select('pull_id, kind')
        .eq('user_id', uid)
        .in('pull_id', rows.map((r) => r.id))
      const map: Record<string, Set<ReactionKind>> = {}
      for (const r of rx ?? []) (map[r.pull_id] ??= new Set()).add(r.kind as ReactionKind)
      setMine(map)
    } else {
      setMine({})
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { pulls, mine, loading, error, refresh: load }
}

/** Add/remove one of the current user's reactions. user_id defaults to auth.uid(). */
export async function addReaction(pullId: string, kind: ReactionKind): Promise<void> {
  const { error } = await supabase.from('pull_reactions').insert({ pull_id: pullId, kind })
  if (error) throw new Error(error.message)
}
export async function removeReaction(pullId: string, kind: ReactionKind): Promise<void> {
  const { error } = await supabase.from('pull_reactions').delete().eq('pull_id', pullId).eq('kind', kind)
  if (error) throw new Error(error.message)
}
