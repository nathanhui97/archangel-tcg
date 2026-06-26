import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { useTrade, sendMessage, respondToTrade, markTradeRead } from '@/lib/trades'
import { colors } from '@/lib/theme'
import type { Message } from '@/types'

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <View className={`px-4 mb-2 ${mine ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-primary rounded-br-md' : 'bg-surface-control rounded-bl-md'}`}
      >
        <Text className={`text-[15px] font-display ${mine ? 'text-primary-ink' : 'text-ink'}`}>{message.body}</Text>
      </View>
    </View>
  )
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const uid = session?.user.id
  const { trade, messages, otherHandle, iAmRequester, loading, refresh } = useTrade(id)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const markedRef = useRef(false)

  // Mark read once the thread loads (and whenever new messages arrive).
  useEffect(() => {
    if (trade && !markedRef.current) {
      markedRef.current = true
      markTradeRead(trade.id, iAmRequester).catch(() => undefined)
    }
  }, [trade, iAmRequester])

  const status = trade?.status
  const canMessage = status === 'pending' || status === 'accepted' || status === 'completed'
  const isRecipientPending = status === 'pending' && !iAmRequester

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
    async (next: 'accepted' | 'declined') => {
      if (!id) return
      try {
        await respondToTrade(id, next)
        await refresh()
      } catch (err) {
        Alert.alert('Error', (err as Error).message)
      }
    },
    [id, refresh]
  )

  const reversed = [...messages].reverse()

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Stack.Screen options={{ headerShown: true, title: otherHandle ? `@${otherHandle}` : 'Trade' }} />

      {loading && messages.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Status banner */}
          {status && status !== 'accepted' && (
            <View className="mx-4 mt-3 bg-surface border border-subtle rounded-2xl px-4 py-3">
              {isRecipientPending ? (
                <>
                  <Text className="text-ink font-display-semibold text-sm">@{otherHandle} wants to trade</Text>
                  <Text className="text-muted text-xs mt-0.5 font-display">Accept to start arranging a meetup.</Text>
                  <View className="flex-row gap-3 mt-3">
                    <Pressable
                      onPress={() => respond('declined')}
                      className="flex-1 items-center py-2.5 rounded-xl border border-subtle active:opacity-70"
                    >
                      <Text className="text-muted-2 font-display-semibold text-sm">Decline</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => respond('accepted')}
                      className="flex-1 items-center py-2.5 rounded-xl bg-primary active:opacity-90"
                    >
                      <Text className="font-display-bold text-sm" style={{ color: colors.primaryInk }}>Accept</Text>
                    </Pressable>
                  </View>
                </>
              ) : status === 'pending' ? (
                <Text className="text-muted text-sm font-display">Request sent · waiting for @{otherHandle} to accept.</Text>
              ) : status === 'declined' ? (
                <Text className="text-faint-2 text-sm font-display">This trade was declined.</Text>
              ) : status === 'cancelled' ? (
                <Text className="text-faint-2 text-sm font-display">This trade was cancelled.</Text>
              ) : (
                <Text className="text-faint-2 text-sm font-display">Trade completed.</Text>
              )}
            </View>
          )}

          {reversed.length === 0 ? (
            <View className="flex-1 items-center justify-center px-10">
              <Text className="text-muted text-sm text-center font-display">
                {isRecipientPending
                  ? 'No messages yet.'
                  : 'Send a message to introduce the trade — what you’d like and what you’re offering.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={reversed}
              inverted
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ paddingVertical: 12 }}
              keyboardDismissMode="interactive"
              renderItem={({ item }) => <Bubble message={item} mine={item.sender_id === uid} />}
            />
          )}

          {/* Composer */}
          {status === 'declined' || status === 'cancelled' ? (
            <View style={{ paddingBottom: insets.bottom + 10 }} className="px-5 pt-3 border-t border-subtle bg-bg">
              <Text className="text-faint-2 text-xs text-center font-display">This conversation is closed.</Text>
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
                  placeholder={canMessage ? 'Message…' : 'Waiting…'}
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
    </KeyboardAvoidingView>
  )
}
