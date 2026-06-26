import { useCallback } from 'react'
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTrades, type TradeThread } from '@/lib/trades'
import { Avatar } from '@/components/ui'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { colors } from '@/lib/theme'

function statusLine(t: TradeThread): { text: string; tone: 'primary' | 'muted' | 'faint' } {
  if (t.status === 'pending') {
    return t.iAmRequester
      ? { text: 'Request sent · waiting', tone: 'muted' }
      : { text: 'Wants to trade with you', tone: 'primary' }
  }
  if (t.status === 'declined') return { text: 'Declined', tone: 'faint' }
  if (t.status === 'cancelled') return { text: 'Cancelled', tone: 'faint' }
  if (t.status === 'completed') return { text: 'Trade completed', tone: 'faint' }
  return { text: t.lastMessage ?? 'Say hi to arrange a meetup', tone: t.lastMessage ? 'muted' : 'faint' }
}

const TONE: Record<'primary' | 'muted' | 'faint', string> = {
  primary: 'text-primary',
  muted: 'text-muted',
  faint: 'text-faint-2',
}

function Row({ thread, onPress }: { thread: TradeThread; onPress: () => void }) {
  const line = statusLine(thread)
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-5 py-3.5 active:opacity-70">
      <View>
        <Avatar handle={thread.otherHandle} size={48} />
        {thread.unread && (
          <View className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2" style={{ borderColor: colors.bg }} />
        )}
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-ink font-mono-bold text-sm">@{thread.otherHandle}</Text>
        <Text className={`text-xs mt-0.5 font-display ${TONE[line.tone]}`} numberOfLines={1}>{line.text}</Text>
      </View>
      {thread.status === 'pending' && !thread.iAmRequester ? (
        <View className="bg-primary/10 border border-primary-soft rounded-full px-2.5 py-1 mr-1">
          <Text className="text-primary font-mono-bold text-[10px]">NEW</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.faint2} />
      )}
    </Pressable>
  )
}

export default function MessagesScreen() {
  const router = useRouter()
  const { threads, loading, refresh } = useTrades()

  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  const subtitle =
    threads.length > 0 ? `${threads.length} conversation${threads.length !== 1 ? 's' : ''}` : 'Trade proposals & chats'

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Messages" subtitle={subtitle} />

      {loading && threads.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          ItemSeparatorComponent={() => <View className="h-px ml-[76px]" style={{ backgroundColor: colors.borderHair }} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Row thread={item} onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: item.id } })} />
          )}
          ListEmptyComponent={
            <View className="items-center pt-24 px-8">
              <RadarLogo size={120} />
              <Text className="text-ink font-display-semibold text-base mt-6">No messages yet</Text>
              <Text className="text-muted text-sm mt-2 text-center font-display">
                Propose a trade on a card you want and the conversation shows up here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
