import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderHeight } from '@react-navigation/elements'
import { ChatKeyboardAvoider } from '@/components/KeyboardCompat'
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import {
  useTrade,
  sendMessage,
  respondToProposal,
  markTradeRead,
  type ProposalView,
  type ProposalItemView,
} from '@/lib/trades'
import { colors } from '@/lib/theme'
import type { Message } from '@/types'

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function TextBubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <View className={`px-4 mb-2 ${mine ? 'items-end' : 'items-start'}`}>
      <View className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-primary rounded-br-md' : 'bg-surface-control rounded-bl-md'}`}>
        <Text className={`text-[15px] font-display ${mine ? 'text-primary-ink' : 'text-ink'}`}>{message.body}</Text>
      </View>
      <Text className="text-faint-2 text-[10px] font-mono mt-1 mx-1">{fmtTime(message.created_at)}</Text>
    </View>
  )
}

const STATUS_BADGE: Record<string, { label: string; box: string; text: string }> = {
  pending: { label: 'PENDING', box: 'bg-amber/10', text: 'text-amber' },
  accepted: { label: 'ACCEPTED', box: 'bg-primary/10', text: 'text-primary' },
  declined: { label: 'DECLINED', box: 'bg-danger/10', text: 'text-danger' },
  withdrawn: { label: 'WITHDRAWN', box: 'bg-surface-control', text: 'text-faint-2' },
}

function ItemLine({ label, items, cash, accent }: { label: string; items: ProposalItemView[]; cash: number; accent: boolean }) {
  return (
    <View className="mt-2">
      <Text className={`font-mono-bold text-[10px] tracking-wider ${accent ? 'text-primary' : 'text-muted-2'}`}>{label}</Text>
      <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1 mt-1">
        {items.map((it, i) => (
          <View key={i} className="flex-row items-center gap-1">
            <View style={{ width: 20, height: 28 }} className="rounded overflow-hidden bg-surface-raised border border-subtle">
              {it.image_url ? <Image source={{ uri: it.image_url }} resizeMode="cover" className="w-full h-full" /> : null}
            </View>
            <Text className="text-ink font-mono text-[11px]">
              {it.card_id}
              {it.is_foil ? <Text className="text-gold"> Foil</Text> : null}
              {it.quantity > 1 ? ` ×${it.quantity}` : ''}
            </Text>
          </View>
        ))}
        {cash > 0 && (
          <View className="px-1.5 py-0.5 rounded bg-surface-control">
            <Text className="text-gold font-mono-bold text-[11px]">${(cash / 100).toFixed(0)}</Text>
          </View>
        )}
        {items.length === 0 && cash === 0 && <Text className="text-faint text-[11px] font-display">—</Text>}
      </View>
    </View>
  )
}

function ProposalBubble({
  message, view, mine, canRespond, onAccept, onDecline,
}: {
  message: Message
  view: ProposalView
  mine: boolean
  canRespond: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  const { proposal } = view
  // From the viewer's perspective (proposer's "give" is what they receive, etc.)
  const youGive = mine ? view.give : view.get
  const youGet = mine ? view.get : view.give
  const giveCash = mine ? proposal.cash_cents : 0
  const getCash = mine ? 0 : proposal.cash_cents
  const badge = STATUS_BADGE[proposal.status] ?? STATUS_BADGE.pending

  return (
    <View className={`px-4 mb-2 ${mine ? 'items-end' : 'items-start'}`}>
      <View className="w-[86%] rounded-2xl border border-primary-soft bg-surface px-3.5 py-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name="swap-horizontal" size={15} color={colors.primary} />
          <Text className="text-ink font-display-semibold text-sm flex-1">Trade proposal</Text>
          <View className={`rounded px-1.5 py-0.5 ${badge.box}`}>
            <Text className={`font-mono-bold text-[9px] ${badge.text}`}>{badge.label}</Text>
          </View>
        </View>

        <View className="h-px my-2" style={{ backgroundColor: colors.borderHair }} />
        <ItemLine label="YOU GIVE" items={youGive} cash={giveCash} accent={false} />
        <ItemLine label="YOU GET" items={youGet} cash={getCash} accent />

        {canRespond && proposal.status === 'pending' && (
          <View className="flex-row gap-2 mt-3">
            <Pressable onPress={onDecline} className="flex-1 items-center py-2 rounded-lg border border-subtle active:opacity-70">
              <Text className="text-muted-2 font-display-semibold text-sm">Decline</Text>
            </Pressable>
            <Pressable onPress={onAccept} className="flex-1 items-center py-2 rounded-lg bg-primary active:opacity-90">
              <Text className="font-display-bold text-sm" style={{ color: colors.primaryInk }}>Accept</Text>
            </Pressable>
          </View>
        )}
      </View>
      <Text className="text-faint-2 text-[10px] font-mono mt-1 mx-1">
        {mine ? 'You proposed' : 'Proposed'} · {fmtTime(message.created_at)}
      </Text>
    </View>
  )
}

function InquiryBubble({
  message, card, mine, onOffer,
}: {
  message: Message
  card?: { id: string; image_url: string | null; name: string | null }
  mine: boolean
  onOffer: () => void
}) {
  return (
    <View className={`px-4 mb-2 ${mine ? 'items-end' : 'items-start'}`}>
      <Pressable onPress={onOffer} className="active:opacity-80">
        <View style={{ width: 116, height: 162 }} className="rounded-xl overflow-hidden bg-surface-raised border border-primary-soft">
          {card?.image_url ? (
            <Image source={{ uri: card.image_url }} resizeMode="cover" className="w-full h-full" />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Text className="text-faint font-mono text-xs">{message.card_id}</Text>
            </View>
          )}
        </View>
      </Pressable>
      <Text className="text-faint-2 text-[10px] font-mono mt-1 mx-1">
        {mine ? 'You asked about this' : 'Interested in this'} · {fmtTime(message.created_at)}
      </Text>
    </View>
  )
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const { session } = useAuth()
  const uid = session?.user.id
  const { trade, messages, proposalsById, cardsById, otherHandle, otherId, iAmRequester, loading, refresh } = useTrade(id)

  function openOffer(getCardId?: string) {
    router.push({
      pathname: '/(app)/propose',
      params: { tradeId: id, recipientId: otherId ?? '', recipientHandle: otherHandle, ...(getCardId ? { getCardId } : {}) },
    })
  }

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const markedRef = useRef(false)

  // Refresh when returning to the chat (e.g. after sending a proposal).
  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  useEffect(() => {
    if (trade && !markedRef.current) {
      markedRef.current = true
      markTradeRead(trade.id, iAmRequester).catch(() => undefined)
    }
  }, [trade, iAmRequester])

  const status = trade?.status
  const closed = status === 'cancelled'
  const canMessage = status !== 'cancelled'

  async function onSend() {
    const body = draft.trim()
    if (!body || !id) return
    setSending(true)
    try {
      setDraft('')
      await sendMessage(id, body)
      await refresh()
    } catch (err) {
      Alert.alert('Error', (err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const respond = useCallback(
    async (proposalId: string, accept: boolean) => {
      if (!id) return
      try {
        await respondToProposal(proposalId, id, accept)
        await refresh()
      } catch (err) {
        Alert.alert('Error', (err as Error).message)
      }
    },
    [id, refresh]
  )

  const reversed = [...messages].reverse()

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.sender_id === uid
    if (item.kind === 'proposal' && item.proposal_id && proposalsById[item.proposal_id]) {
      return (
        <ProposalBubble
          message={item}
          view={proposalsById[item.proposal_id]}
          mine={mine}
          canRespond={!mine && !closed}
          onAccept={() => respond(item.proposal_id as string, true)}
          onDecline={() => respond(item.proposal_id as string, false)}
        />
      )
    }
    if (item.kind === 'inquiry') {
      return (
        <InquiryBubble
          message={item}
          card={item.card_id ? cardsById[item.card_id] : undefined}
          mine={mine}
          onOffer={() => openOffer(item.card_id ?? undefined)}
        />
      )
    }
    return <TextBubble message={item} mine={mine} />
  }

  return (
    <ChatKeyboardAvoider offset={headerHeight} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: otherHandle ? `@${otherHandle}` : 'Trade',
          headerRight:
            otherId && !closed
              ? () => (
                  <Pressable onPress={() => openOffer()} className="flex-row items-center gap-1 active:opacity-60">
                    <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                    <Text className="text-primary font-display-semibold text-sm">Propose</Text>
                  </Pressable>
                )
              : undefined,
        }}
      />

      {loading && messages.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          {reversed.length === 0 ? (
            <View className="flex-1 items-center justify-center px-10">
              <Text className="text-muted text-sm text-center font-display">
                Say hi to start — then tap <Text className="text-primary font-display-semibold">Propose</Text> to make an offer.
              </Text>
            </View>
          ) : (
            <FlatList
              data={reversed}
              inverted
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ paddingVertical: 12 }}
              keyboardDismissMode="interactive"
              renderItem={renderItem}
            />
          )}

          {closed ? (
            <View style={{ paddingBottom: insets.bottom + 10 }} className="px-5 pt-3 border-t border-subtle bg-bg">
              <Text className="text-faint-2 text-xs text-center font-display">
                This trade was {status}. The conversation is closed.
              </Text>
            </View>
          ) : (
            <View
              style={{ paddingBottom: insets.bottom + 8 }}
              className="flex-row items-end gap-2 px-3 pt-2 border-t border-subtle bg-bg"
            >
              <View className="flex-1 bg-surface border border-subtle rounded-2xl px-3.5 max-h-28">
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Message…"
                  placeholderTextColor={colors.faint2}
                  multiline
                  className="text-ink py-2.5 text-[15px] font-display"
                  editable={canMessage}
                />
              </View>
              <Pressable
                onPress={onSend}
                disabled={!draft.trim() || sending || !canMessage}
                className={`w-10 h-10 rounded-full items-center justify-center ${draft.trim() && canMessage ? 'bg-primary active:opacity-90' : 'bg-surface-control'}`}
              >
                <Ionicons name="arrow-up" size={20} color={draft.trim() && canMessage ? colors.primaryInk : colors.faint2} />
              </Pressable>
            </View>
          )}
        </>
      )}
    </ChatKeyboardAvoider>
  )
}
