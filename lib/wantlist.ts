import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Card, WantlistItem } from '@/types'

type WantlistItemWithCard = WantlistItem & { card: Card }

export function useMyWantlist() {
  const { session } = useAuth()
  const [items, setItems] = useState<WantlistItemWithCard[]>([])
  const [cardIds, setCardIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    const { data, error: sbError } = await supabase
      .from('wantlist_items')
      .select('*, card:cards(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (sbError) {
      setError(sbError.message)
      setItems([])
      setCardIds(new Set())
    } else {
      const rows = (data ?? []) as WantlistItemWithCard[]
      setItems(rows)
      setCardIds(new Set(rows.map((r) => r.card_id)))
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  return { items, cardIds, loading, error, refresh: load }
}

/** Adds a card to the current user's wantlist. No-op if already added. */
export async function addToWantlist(cardId: string): Promise<{ added: boolean }> {
  // upsert with ignore-duplicate semantics via onConflict
  const { error } = await supabase
    .from('wantlist_items')
    .upsert({ card_id: cardId }, { onConflict: 'user_id,card_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
  return { added: true }
}

export async function removeFromWantlist(itemId: string): Promise<void> {
  const { error } = await supabase.from('wantlist_items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)
}

export async function removeCardFromWantlist(cardId: string): Promise<void> {
  const { error } = await supabase.from('wantlist_items').delete().eq('card_id', cardId)
  if (error) throw new Error(error.message)
}
