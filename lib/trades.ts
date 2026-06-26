import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Trade, TradeStatus, Message } from '@/types'

// ─────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────

/**
 * Start (or reuse) a trade thread with another user. If an open trade already
 * exists between the two (in either direction), returns it instead of creating
 * a duplicate. Returns the trade id.
 */
export async function proposeTrade(myId: string, recipientId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('trades')
    .select('id, status')
    .or(
      `and(requester_id.eq.${myId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${myId})`
    )
  const open = (existing ?? []).find((t: any) => t.status !== 'declined' && t.status !== 'cancelled')
  if (open) return open.id

  const { data, error } = await supabase
    .from('trades')
    .insert({ recipient_id: recipientId }) // requester_id defaults to auth.uid()
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function respondToTrade(tradeId: string, status: TradeStatus): Promise<void> {
  const { error } = await supabase.from('trades').update({ status }).eq('id', tradeId)
  if (error) throw new Error(error.message)
}

export async function sendMessage(tradeId: string, body: string): Promise<void> {
  const trimmed = body.trim()
  if (!trimmed) return
  const { error } = await supabase.from('messages').insert({ trade_id: tradeId, body: trimmed })
  if (error) throw new Error(error.message)
}

export async function markTradeRead(tradeId: string, iAmRequester: boolean): Promise<void> {
  const col = iAmRequester ? 'requester_read_at' : 'recipient_read_at'
  await supabase.from('trades').update({ [col]: new Date().toISOString() }).eq('id', tradeId)
}

// ─────────────────────────────────────────────────────────────────────────
// Inbox: my trade threads
// ─────────────────────────────────────────────────────────────────────────

export type TradeThread = {
  id: string
  status: TradeStatus
  otherHandle: string
  otherId: string
  iAmRequester: boolean
  lastMessage: string | null
  lastAt: string
  unread: boolean
}

export function useTrades() {
  const { session } = useAuth()
  const [threads, setThreads] = useState<TradeThread[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session) return
    const uid = session.user.id
    setLoading(true)

    const { data: tradeRows } = await supabase
      .from('trades')
      .select('*')
      .order('updated_at', { ascending: false })
    const trades = (tradeRows ?? []) as Trade[]
    if (trades.length === 0) {
      setThreads([])
      setLoading(false)
      return
    }

    const otherIds = trades.map((t) => (t.requester_id === uid ? t.recipient_id : t.requester_id))
    const tradeIds = trades.map((t) => t.id)

    const [{ data: profs }, { data: msgs }] = await Promise.all([
      supabase.from('profiles').select('id, handle').in('id', otherIds),
      supabase
        .from('messages')
        .select('trade_id, body, created_at, sender_id')
        .in('trade_id', tradeIds)
        .order('created_at', { ascending: false }),
    ])

    const handleById = new Map((profs ?? []).map((p: any) => [p.id, p.handle as string]))
    const lastByTrade = new Map<string, any>()
    const msgsByTrade = new Map<string, any[]>()
    for (const m of msgs ?? []) {
      if (!lastByTrade.has(m.trade_id)) lastByTrade.set(m.trade_id, m)
      const arr = msgsByTrade.get(m.trade_id) ?? []
      arr.push(m)
      msgsByTrade.set(m.trade_id, arr)
    }

    const result: TradeThread[] = trades
      .map((t) => {
        const iAmRequester = t.requester_id === uid
        const otherId = iAmRequester ? t.recipient_id : t.requester_id
        const myReadAt = iAmRequester ? t.requester_read_at : t.recipient_read_at
        const last = lastByTrade.get(t.id)
        const tradeMsgs = msgsByTrade.get(t.id) ?? []
        const unread = tradeMsgs.some(
          (m) => m.sender_id !== uid && (!myReadAt || m.created_at > myReadAt)
        )
        return {
          id: t.id,
          status: t.status,
          otherHandle: handleById.get(otherId) ?? '?',
          otherId,
          iAmRequester,
          lastMessage: last?.body ?? null,
          lastAt: last?.created_at ?? t.created_at,
          unread,
        }
      })
      .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))

    setThreads(result)
    setLoading(false)
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  return { threads, loading, refresh: load }
}

/** Count of pending trade requests addressed to me (for the inbox badge). */
export function useIncomingTradeCount() {
  const { session } = useAuth()
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (!session) {
      setCount(0)
      return
    }
    const { count: c } = await supabase
      .from('trades')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', session.user.id)
      .eq('status', 'pending')
    setCount(c ?? 0)
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  return { count, refresh: load }
}

// ─────────────────────────────────────────────────────────────────────────
// A single trade thread + its messages (polled while open)
// ─────────────────────────────────────────────────────────────────────────

export function useTrade(tradeId: string | undefined) {
  const { session } = useAuth()
  const uid = session?.user.id
  const [trade, setTrade] = useState<Trade | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [otherHandle, setOtherHandle] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!tradeId || !uid) return
    const { data: t } = await supabase.from('trades').select('*').eq('id', tradeId).maybeSingle()
    if (!t) {
      setLoading(false)
      return
    }
    setTrade(t as Trade)
    const otherId = t.requester_id === uid ? t.recipient_id : t.requester_id
    const { data: p } = await supabase.from('profiles').select('handle').eq('id', otherId).maybeSingle()
    setOtherHandle(p?.handle ?? '?')
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true })
    setMessages((msgs ?? []) as Message[])
    setLoading(false)
  }, [tradeId, uid])

  useEffect(() => {
    load()
  }, [load])

  // Poll for new messages / status changes while the chat is open.
  useEffect(() => {
    if (!tradeId) return
    const interval = setInterval(load, 4000)
    return () => clearInterval(interval)
  }, [tradeId, load])

  const iAmRequester = !!trade && trade.requester_id === uid
  return { trade, messages, otherHandle, iAmRequester, loading, refresh: load }
}
