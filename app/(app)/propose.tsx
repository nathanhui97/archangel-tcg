import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { useMyPublicCards, useUserPublicCards, type TradeCard } from '@/lib/binders'
import { proposeTrade, createProposal, type ProposalItemInput } from '@/lib/trades'
import { CardSelectSheet } from '@/components/CardSelectSheet'
import { MonoLabel } from '@/components/ui'
import { colors } from '@/lib/theme'
import type { Condition } from '@/types'

type Mode = 'cards' | 'cash'

const toInput = (c: TradeCard): ProposalItemInput => ({
  card_id: c.card_id,
  quantity: 1,
  condition: c.condition as Condition,
  is_foil: c.is_foil,
})

function SelectedRow({ card, onRemove }: { card: TradeCard; onRemove: () => void }) {
  return (
    <View className="flex-row items-center bg-surface border border-subtle rounded-xl p-2 mb-2">
      <View style={{ width: 38, height: 53 }} className="rounded-md overflow-hidden bg-surface-raised border border-subtle">
        {card.image_url ? <Image source={{ uri: card.image_url }} resizeMode="cover" className="w-full h-full" /> : null}
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-ink font-mono-bold text-sm">
          {card.card_id}
          {card.is_foil ? <Text className="text-gold"> Foil</Text> : null}
        </Text>
        <Text className="text-muted text-xs mt-0.5 font-display">{card.condition} · ×{1}</Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={8} className="w-7 h-7 rounded-full bg-danger/10 items-center justify-center active:opacity-70">
        <Ionicons name="close" size={15} color={colors.danger} />
      </Pressable>
    </View>
  )
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center gap-1.5 border border-dashed border-primary-soft rounded-xl py-3 active:opacity-70"
    >
      <Ionicons name="add" size={16} color={colors.label} />
      <Text className="text-label text-xs font-display-medium">{label}</Text>
    </Pressable>
  )
}

export default function ProposeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const myId = session?.user.id ?? null
  const { recipientId, recipientHandle, getItemId } = useLocalSearchParams<{
    recipientId: string
    recipientHandle?: string
    getItemId?: string
  }>()

  const { cards: myCards, loading: myLoading } = useMyPublicCards()
  const { cards: theirCards, loading: theirLoading } = useUserPublicCards(recipientId ?? null)

  const [mode, setMode] = useState<Mode>('cards')
  const [give, setGive] = useState<TradeCard[]>([])
  const [get, setGet] = useState<TradeCard[]>([])
  const [cashStr, setCashStr] = useState('')
  const [picker, setPicker] = useState<'give' | 'get' | null>(null)
  const [sending, setSending] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  // Prefill the "you get" side with the card the user came from.
  useEffect(() => {
    if (prefilled || !getItemId || theirCards.length === 0) return
    const match = theirCards.find((c) => c.id === getItemId)
    if (match) setGet([match])
    setPrefilled(true)
  }, [getItemId, theirCards, prefilled])

  const giveIds = useMemo(() => new Set(give.map((c) => c.id)), [give])
  const getIds = useMemo(() => new Set(get.map((c) => c.id)), [get])

  const cashCents = Math.max(0, Math.round((parseFloat(cashStr) || 0) * 100))

  const toggle =
    (side: 'give' | 'get') =>
    (card: TradeCard) => {
      const setter = side === 'give' ? setGive : setGet
      setter((prev) => (prev.some((c) => c.id === card.id) ? prev.filter((c) => c.id !== card.id) : [...prev, card]))
    }

  const canSend =
    mode === 'cash'
      ? cashCents > 0 && get.length > 0
      : get.length > 0 && (give.length > 0 || cashCents > 0)

  async function send() {
    if (!myId || !recipientId || !canSend) return
    setSending(true)
    try {
      const giveInputs = mode === 'cash' ? [] : give.map(toInput)
      const getInputs = get.map(toInput)
      const tradeId = await proposeTrade(myId, recipientId)
      await createProposal(tradeId, giveInputs, getInputs, cashCents)
      router.replace({ pathname: '/(app)/chat/[id]', params: { id: tradeId } })
    } catch (err) {
      Alert.alert('Could not send', (err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const summary =
    mode === 'cash'
      ? `$${(cashCents / 100).toFixed(0)} for ${get.length}`
      : `${give.length}${cashCents > 0 ? ` + $${(cashCents / 100).toFixed(0)}` : ''} for ${get.length}`

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: 'Propose trade' }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Text className="text-muted text-sm font-display mb-4">
          to <Text className="text-ink font-mono">@{recipientHandle ?? '…'}</Text>
        </Text>

        {/* Mode */}
        <View className="flex-row bg-surface border border-subtle rounded-xl p-0.5 mb-5">
          {([
            { key: 'cards', label: 'Trade cards', icon: 'swap-horizontal' as const },
            { key: 'cash', label: 'Offer cash', icon: 'cash-outline' as const },
          ] as const).map((m) => {
            const active = mode === m.key
            return (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-[10px] ${active ? 'bg-primary/10' : ''}`}
              >
                <Ionicons name={m.icon} size={15} color={active ? colors.primary : colors.muted2} />
                <Text className={`text-sm font-display-semibold ${active ? 'text-primary' : 'text-muted-2'}`}>{m.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {/* YOU GIVE (cards mode only) */}
        {mode === 'cards' && (
          <View className="mb-2">
            <View className="flex-row items-baseline gap-2 mb-2.5">
              <MonoLabel>YOU GIVE</MonoLabel>
              <Text className="text-label text-xs font-display">from your binders</Text>
            </View>
            {give.map((c) => (
              <SelectedRow key={c.id} card={c} onRemove={() => toggle('give')(c)} />
            ))}
            <AddButton label="Add a card you'll give" onPress={() => setPicker('give')} />
          </View>
        )}

        {/* Swap divider */}
        {mode === 'cards' && (
          <View className="items-center my-4">
            <View className="w-9 h-9 rounded-full bg-surface border border-primary-soft items-center justify-center">
              <Ionicons name="swap-vertical" size={18} color={colors.primary} />
            </View>
          </View>
        )}

        {/* YOU GET */}
        <View className="mb-2">
          <View className="flex-row items-baseline gap-2 mb-2.5">
            <MonoLabel>YOU GET</MonoLabel>
            <Text className="text-label text-xs font-display">from their binders</Text>
          </View>
          {get.map((c) => (
            <SelectedRow key={c.id} card={c} onRemove={() => toggle('get')(c)} />
          ))}
          <AddButton label="Add a card you want" onPress={() => setPicker('get')} />
        </View>

        {/* Cash */}
        <View className="mt-5">
          <MonoLabel className="mb-2.5">{mode === 'cash' ? 'CASH OFFER' : 'ADD CASH (OPTIONAL)'}</MonoLabel>
          <View className="flex-row items-center bg-surface border border-subtle rounded-xl px-4">
            <Text className="text-muted text-lg font-display">$</Text>
            <TextInput
              value={cashStr}
              onChangeText={(t) => setCashStr(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.faint2}
              keyboardType="decimal-pad"
              className="flex-1 text-ink py-3 ml-1 text-lg font-display"
            />
          </View>
          {mode === 'cards' && (
            <Text className="text-faint text-xs mt-2 font-display">Optionally add cash to even it out.</Text>
          )}
        </View>

        {(myLoading || theirLoading) && (
          <ActivityIndicator color={colors.primary} className="mt-6" />
        )}
      </ScrollView>

      {/* Footer */}
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="flex-row items-center gap-3 px-5 pt-3 border-t border-subtle bg-bg"
      >
        <Text className="text-muted-2 font-mono-bold text-sm flex-1">{summary}</Text>
        <Pressable
          onPress={send}
          disabled={!canSend || sending}
          style={canSend && !sending ? { shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } } : undefined}
          className={`flex-row items-center justify-center gap-2 px-6 h-12 rounded-2xl ${canSend && !sending ? 'bg-primary active:opacity-90' : 'bg-surface-control'}`}
        >
          <Text className={`font-display-bold text-base ${canSend && !sending ? 'text-primary-ink' : 'text-faint'}`}>
            {sending ? 'Sending…' : 'Send proposal'}
          </Text>
        </Pressable>
      </View>

      <CardSelectSheet
        visible={picker === 'give'}
        onClose={() => setPicker(null)}
        title="Add cards you'll give"
        emptyText="You have no cards in a public binder yet. Make a binder public to offer cards."
        loading={myLoading}
        cards={myCards}
        selectedIds={giveIds}
        onToggle={toggle('give')}
      />
      <CardSelectSheet
        visible={picker === 'get'}
        onClose={() => setPicker(null)}
        title="Add cards you want"
        emptyText="This trader has no public cards right now."
        loading={theirLoading}
        cards={theirCards}
        selectedIds={getIds}
        onToggle={toggle('get')}
      />
    </View>
  )
}
