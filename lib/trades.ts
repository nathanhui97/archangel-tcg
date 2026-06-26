import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Trade, TradeStatus, Message, TradeProposal, Condition } from '@/types'

// ─────────────────────────────────────────────────────────────────────────
// Proposals
// ─────────────────────────────────────────────────────────────────────────

export type ProposalItemInput = {
  card_id: string
  quantity: number
  condition: Condition
  is_foil: boolean
}

export type ProposalItemView = {
  card_id: string
  quantity: number
  condition: string
  is_foil: boolean
  image_url: string | null
  name: string | null
}

export type ProposalView = {
  proposal: TradeProposal
  give: ProposalItemView[]
  get: ProposalItemView[]
}

function summarize(give: ProposalItemInput[], get: ProposalItemInput[], cashCents: number): string {
  const g = give.reduce((n, i) => n + i.quantity, 0)
  const r = get.reduce((n, i) => n + i.quantity, 0)
  const cash = cashCents > 0 ? ` + $${(cashCents / 100).toFixed(0)}` : ''
  return `Proposed: ${g}${cash} for ${r}`
}

/**
 * Create a structured proposal inside a trade: the cards the proposer gives/gets
 * plus optional cash. Also posts a 'proposal' message so it appears in the chat.
 */
export async function createProposal(
  tradeId: string,
  give: ProposalItemInput[],
  get: ProposalItemInput[],
  cashCents: number
): Promise<string> {
  const { data: prop, error } = await supabase
    .from('trade_proposals')
    .insert({ trade_id: tradeId, cash_cents: cashCents }) // proposer_id defaults to auth.uid()
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const items = [
    ...give.map((i) => ({ proposal_id: prop.id, side: 'give', ...i })),
    ...get.map((i) => ({ proposal_id: prop.id, side: 'get', ...i })),
  ]
  if (items.length > 0) {
    const { error: e2 } = await supabase.from('trade_proposal_items').insert(items)
    if (e2) throw new Error(e2.message)
  }

  const { error: e3 } = await supabase
    .from('messages')
    .insert({ trade_id: tradeId, kind: 'proposal', proposal_id: prop.id, body: summarize(give, get, cashCents) })
  if (e3) throw new Error(e3.message)

  return prop.id as string
}

/**
 * Accept or decline a proposal. Accepting marks the trade accepted (a deal was
 * struck); declining only marks the proposal — the conversation stays open so
 * they can keep negotiating and propose again.
 */
export async function respondToProposal(proposalId: string, tradeId: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from('trade_proposals')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', proposalId)
  if (error) throw new Error(error.message)
  if (accept) {
    const { error: e2 } = await supabase.from('trades').update({ status: 'accepted' }).eq('id', tradeId)
    if (e2) throw new Error(e2.message)
  }
}

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
  const [proposalsById, setProposalsById] = useState<Record<string, ProposalView>>({})
  const [otherHandle, setOtherHandle] = useState('')
  const [otherId, setOtherId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!tradeId || !uid) return
    const { data: t } = await supabase.from('trades').select('*').eq('id', tradeId).maybeSingle()
    if (!t) {
      setLoading(false)
      return
    }
    setTrade(t as Trade)
    const other = t.requester_id === uid ? t.recipient_id : t.requester_id
    setOtherId(other)
    const { data: p } = await supabase.from('profiles').select('handle').eq('id', other).maybeSingle()
    setOtherHandle(p?.handle ?? '?')
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true })
    const messageList = (msgs ?? []) as Message[]
    setMessages(messageList)

    // Resolve any proposals referenced by proposal-kind messages.
    const propIds = messageList.filter((m) => m.kind === 'proposal' && m.proposal_id).map((m) => m.proposal_id as string)
    if (propIds.length > 0) {
      const [{ data: props }, { data: pItems }] = await Promise.all([
        supabase.from('trade_proposals').select('*').in('id', propIds),
        supabase.from('trade_proposal_items').select('*').in('proposal_id', propIds),
      ])
      const cardIds = [...new Set((pItems ?? []).map((i: any) => i.card_id))]
      const { data: cardsData } = cardIds.length
        ? await supabase.from('cards').select('id, image_url, name').in('id', cardIds)
        : { data: [] as any[] }
      const cardById = new Map((cardsData ?? []).map((c: any) => [c.id, c]))
      const map: Record<string, ProposalView> = {}
      for (const pr of (props ?? []) as TradeProposal[]) {
        map[pr.id] = { proposal: pr, give: [], get: [] }
      }
      for (const it of (pItems ?? []) as any[]) {
        const view = map[it.proposal_id]
        if (!view) continue
        const card = cardById.get(it.card_id)
        const itemView: ProposalItemView = {
          card_id: it.card_id,
          quantity: it.quantity,
          condition: it.condition,
          is_foil: it.is_foil,
          image_url: card?.image_url ?? null,
          name: card?.name ?? null,
        }
        ;(it.side === 'give' ? view.give : view.get).push(itemView)
      }
      setProposalsById(map)
    } else {
      setProposalsById({})
    }
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
  return { trade, messages, proposalsById, otherHandle, otherId, iAmRequester, loading, refresh: load }
}
