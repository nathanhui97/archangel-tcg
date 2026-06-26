import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Binder, BinderItem, BinderType, Card, Condition } from '@/types'

// ─────────────────────────────────────────────────────────────────────────
// Binders list (the current user's binders)
// ─────────────────────────────────────────────────────────────────────────

type BinderWithCount = Binder & { item_count: number; cover_urls: string[] }

export function useMyBinders() {
  const { session } = useAuth()
  const [binders, setBinders] = useState<BinderWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    // Two-step: fetch binders, then a single count query per binder
    const { data: rows, error: bErr } = await supabase
      .from('binders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (bErr) {
      setError(bErr.message)
      setLoading(false)
      return
    }

    const counts = await Promise.all(
      (rows ?? []).map(async (b) => {
        const [{ count }, coverRes] = await Promise.all([
          supabase
            .from('binder_items')
            .select('id', { count: 'exact', head: true })
            .eq('binder_id', b.id),
          supabase
            .from('binder_items')
            .select('card:cards(image_url)')
            .eq('binder_id', b.id)
            .order('created_at', { ascending: false })
            .limit(4),
        ])
        const cover_urls = (coverRes.data ?? [])
          .map((r: any) => r.card?.image_url as string | null)
          .filter((u): u is string => !!u)
        return { ...(b as Binder), item_count: count ?? 0, cover_urls }
      })
    )

    setBinders(counts)
    setLoading(false)
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  return { binders, loading, error, refresh: load }
}

// ─────────────────────────────────────────────────────────────────────────
// "For trade" — every card across the user's PUBLIC binders (what's on the radar)
// ─────────────────────────────────────────────────────────────────────────

export type TradeCard = {
  id: string
  card_id: string
  image_url: string | null
  name: string | null
  quantity: number
  condition: string
  is_foil: boolean
}

export function useMyPublicCards() {
  const { session } = useAuth()
  const [cards, setCards] = useState<TradeCard[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const { data } = await supabase
      .from('binder_items')
      .select('id, card_id, quantity, condition, is_foil, created_at, card:cards(image_url, name), binder:binders!inner(is_public, user_id)')
      .eq('binder.user_id', session.user.id)
      .eq('binder.is_public', true)
      .order('created_at', { ascending: false })
    const mapped: TradeCard[] = (data ?? []).map((r: any) => ({
      id: r.id,
      card_id: r.card_id,
      quantity: r.quantity,
      condition: r.condition,
      is_foil: r.is_foil,
      image_url: r.card?.image_url ?? null,
      name: r.card?.name ?? null,
    }))
    setCards(mapped)
    setLoading(false)
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  return { cards, loading, refresh: load }
}

export async function createBinder(
  name: string,
  isPublic: boolean,
  binderType: BinderType = 'collection'
): Promise<Binder> {
  const trimmed = name.trim()
  if (trimmed.length === 0 || trimmed.length > 60) {
    throw new Error('Binder name must be 1–60 characters.')
  }
  const { data, error } = await supabase
    .from('binders')
    .insert({ name: trimmed, is_public: isPublic, binder_type: binderType })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Binder
}

export async function deleteBinder(binderId: string): Promise<void> {
  const { error } = await supabase.from('binders').delete().eq('id', binderId)
  if (error) throw new Error(error.message)
}

export async function updateBinder(
  binderId: string,
  updates: Partial<Pick<Binder, 'name' | 'is_public' | 'binder_type'>>
): Promise<void> {
  const { error } = await supabase.from('binders').update(updates).eq('id', binderId)
  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────────────────────────────────
// Single binder + its items
// ─────────────────────────────────────────────────────────────────────────

type BinderItemWithCard = BinderItem & { card: Card }

export function useBinder(binderId: string | undefined) {
  const [binder, setBinder] = useState<Binder | null>(null)
  const [items, setItems] = useState<BinderItemWithCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!binderId) return
    setLoading(true)
    setError(null)

    const [binderRes, itemsRes] = await Promise.all([
      supabase.from('binders').select('*').eq('id', binderId).maybeSingle(),
      supabase
        .from('binder_items')
        .select('*, card:cards(*)')
        .eq('binder_id', binderId)
        .order('created_at', { ascending: false }),
    ])

    if (binderRes.error) setError(binderRes.error.message)
    else setBinder(binderRes.data as Binder)

    if (itemsRes.error) setError(itemsRes.error.message)
    else setItems((itemsRes.data ?? []) as BinderItemWithCard[])

    setLoading(false)
  }, [binderId])

  useEffect(() => {
    load()
  }, [load])

  return { binder, items, loading, error, refresh: load }
}

// ─────────────────────────────────────────────────────────────────────────
// Mutations on items
// ─────────────────────────────────────────────────────────────────────────

type AddCardInput = {
  binderId: string
  cardId: string
  quantity: number
  condition: Condition
  isFoil: boolean
}

/**
 * Add a card to a binder. If the same card+condition+foil combo already
 * exists in this binder, we bump the quantity instead of inserting a duplicate.
 */
export async function addCardToBinder(input: AddCardInput): Promise<void> {
  const { binderId, cardId, quantity, condition, isFoil } = input

  // Look for an existing matching row
  const { data: existing, error: lookupError } = await supabase
    .from('binder_items')
    .select('id, quantity')
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .eq('condition', condition)
    .eq('is_foil', isFoil)
    .maybeSingle()

  if (lookupError) throw new Error(lookupError.message)

  if (existing) {
    const { error } = await supabase
      .from('binder_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from('binder_items').insert({
    binder_id: binderId,
    card_id: cardId,
    quantity,
    condition,
    is_foil: isFoil,
  })
  if (error) throw new Error(error.message)
}

/**
 * Add several cards to a binder in one go (multi-select picker).
 * Defaults to Near Mint, non-foil, qty 1 — users refine condition/qty later.
 */
export async function addCardsToBinder(
  binderId: string,
  cardIds: string[],
  opts: { condition?: Condition; isFoil?: boolean; quantity?: number } = {}
): Promise<void> {
  const condition = opts.condition ?? 'NM'
  const isFoil = opts.isFoil ?? false
  const quantity = opts.quantity ?? 1
  // Sequential: each add reads-then-writes to bump duplicates, so we avoid
  // racing two writes against the same card row.
  for (const cardId of cardIds) {
    await addCardToBinder({ binderId, cardId, quantity, condition, isFoil })
  }
}

export async function updateBinderItem(
  itemId: string,
  updates: Partial<Pick<BinderItem, 'quantity' | 'condition' | 'is_foil' | 'notes'>>
): Promise<void> {
  const { error } = await supabase.from('binder_items').update(updates).eq('id', itemId)
  if (error) throw new Error(error.message)
}

export async function removeBinderItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('binder_items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)
}
