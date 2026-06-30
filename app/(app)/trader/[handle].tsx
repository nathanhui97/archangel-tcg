import { useState } from 'react'
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator, useWindowDimensions } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useMyProfile } from '@/lib/profile'
import { useNearbyCards, useNearbyWantlists } from '@/lib/nearby'
import { useMyPublicCards } from '@/lib/binders'
import { useMyWantlist } from '@/lib/wantlist'
import { proposeTrade } from '@/lib/trades'
import { Avatar, Badge, MonoLabel } from '@/components/ui'
import { CardTile, gridTileWidth } from '@/components/ui/CardTile'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { colors } from '@/lib/theme'

type Segment = 'wants' | 'trade'

export default function TraderProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { handle } = useLocalSearchParams<{ handle: string }>()
  const { width } = useWindowDimensions()
  const tileW = gridTileWidth(width)
  const { profile } = useMyProfile()
  const [segment, setSegment] = useState<Segment>('trade')

  const { cards, loading: cardsLoading } = useNearbyCards(profile?.lat ?? null, profile?.lng ?? null, 100, null)
  const { items: wants, loading: wantsLoading } = useNearbyWantlists(profile?.lat ?? null, profile?.lng ?? null, 100, null)
  const dataLoading = cardsLoading || wantsLoading
  const { cards: myPublicCards } = useMyPublicCards()
  const { cardIds: myWantIds } = useMyWantlist()

  const theirCards = cards.filter((c) => c.owner_handle === handle)
  const theirWants = wants.filter((w) => w.wanter_handle === handle)
  const myCardIds = new Set(myPublicCards.map((c) => c.card_id))

  // distance: from any of their nearby items
  const distance = theirCards[0]?.distance_km ?? theirWants[0]?.distance_km ?? null
  const ships = theirCards[0]?.owner_willing_to_ship ?? false
  const distLabel = distance !== null ? `${distance} km away` : ships ? 'Ships anywhere' : 'Nearby'

  const youHave = theirWants.filter((w) => myCardIds.has(w.card_id)).length
  const youWant = theirCards.filter((c) => myWantIds.has(c.card_id)).length

  const recipientId = theirCards[0]?.owner_id ?? theirWants[0]?.wanter_id ?? null
  const [inquiring, setInquiring] = useState(false)

  async function handleInquire() {
    if (!profile?.id || !recipientId) {
      Alert.alert('Unavailable', 'Could not start a conversation with this trader right now.')
      return
    }
    try {
      setInquiring(true)
      const tradeId = await proposeTrade(profile.id, recipientId)
      router.push({ pathname: '/(app)/chat/[id]', params: { id: tradeId } })
    } catch (err) {
      Alert.alert('Error', (err as Error).message)
    } finally {
      setInquiring(false)
    }
  }

  const data = segment === 'trade' ? theirCards : theirWants

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: '' }} />

      {dataLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
      <FlatList
        data={data}
        keyExtractor={(item: any, i) => `${segment}-${item.binder_item_id ?? item.card_id}-${i}`}
        numColumns={3}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 14, paddingBottom: insets.bottom + 96 }}
        ListHeaderComponent={
          <View>
            {/* Identity */}
            <View className="items-center px-6 pt-1 pb-4">
              <Avatar handle={handle ?? '?'} size={64} />
              <Text className="text-ink text-xl font-mono-bold mt-3">@{handle}</Text>
              <View className="flex-row items-center gap-1.5 mt-1">
                <Ionicons name="location-outline" size={13} color={colors.muted} />
                <Text className="text-muted text-sm font-display">{distLabel}</Text>
              </View>
            </View>

            {/* Match callout */}
            {(youHave > 0 || youWant > 0) && (
              <View className="mx-5 mb-5 flex-row items-center bg-primary/10 border border-primary-soft rounded-2xl px-4 py-3.5">
                <RadarLogo size={28} />
                <View className="ml-3 flex-1">
                  {youHave > 0 && (
                    <Text className="text-ink font-display-semibold text-sm">
                      You have <Text className="text-primary">{youHave} card{youHave !== 1 ? 's' : ''}</Text> they want
                    </Text>
                  )}
                  {youWant > 0 && (
                    <Text className="text-muted text-xs mt-0.5 font-display">
                      They have {youWant} card{youWant !== 1 ? 's' : ''} on your wantlist
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Segmented */}
            <View className="mx-5 mb-4 flex-row bg-surface border border-subtle rounded-xl p-0.5">
              {([
                { key: 'trade', label: `For trade · ${theirCards.length}` },
                { key: 'wants', label: `Wants · ${theirWants.length}` },
              ] as const).map((s) => {
                const active = segment === s.key
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => setSegment(s.key)}
                    className={`flex-1 items-center py-2 rounded-[10px] ${active ? 'bg-primary/10' : ''}`}
                  >
                    <Text className={`text-sm font-display-semibold ${active ? 'text-primary' : 'text-muted-2'}`}>{s.label}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        }
        renderItem={({ item }: { item: any }) => {
          if (segment === 'trade') {
            return (
              <CardTile
                width={tileW}
                uri={item.card_image_url}
                topLeft={myWantIds.has(item.card_id) ? <Badge label="WANT" tone="want" /> : undefined}
                title={item.card_id}
                titleClassName="text-ink font-mono-bold text-[11px]"
                onPress={() => router.push({ pathname: '/(app)/card/[id]', params: { id: item.card_id } })}
              />
            )
          }
          return (
            <CardTile
              width={tileW}
              uri={item.card_image_url}
              topLeft={myCardIds.has(item.card_id) ? <Badge label="YOU HAVE" tone="have" /> : undefined}
              title={item.card_id}
              titleClassName="text-ink font-mono-bold text-[11px]"
              onPress={() => router.push({ pathname: '/(app)/card/[id]', params: { id: item.card_id } })}
            />
          )
        }}
        ListEmptyComponent={
          <View className="items-center pt-12 px-8">
            <Text className="text-muted text-sm text-center font-display">
              {segment === 'trade' ? 'No public cards for trade.' : 'Nothing on their wantlist nearby.'}
            </Text>
          </View>
        }
      />

      {/* Sticky action */}
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="absolute left-0 right-0 bottom-0 px-5 pt-3 bg-tabbar border-t border-subtle flex-row gap-3"
      >
        <Pressable
          onPress={handleInquire}
          disabled={inquiring}
          style={{ shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } }}
          className="flex-1 flex-row items-center justify-center gap-2 bg-primary rounded-2xl py-4 active:opacity-90"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primaryInk} />
          <Text className="text-primary-ink font-display-bold text-base">{inquiring ? 'Opening…' : 'Inquire'}</Text>
        </Pressable>
      </View>
        </>
      )}
    </View>
  )
}
