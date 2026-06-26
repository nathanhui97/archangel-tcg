import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCard } from '@/lib/cards'
import { useMyProfile } from '@/lib/profile'
import { useNearbyCards } from '@/lib/nearby'
import { useMyWantlist, addToWantlist, removeFromWantlist } from '@/lib/wantlist'
import type { NearbyCard } from '@/types'
import { CardThumb, Avatar, MonoLabel } from '@/components/ui'
import { colors } from '@/lib/theme'

function distanceLabel(item: NearbyCard): string {
  if (item.distance_km !== null) return `${item.distance_km} km`
  if (item.owner_willing_to_ship) return 'Ships'
  return '—'
}

export default function CardDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { card, loading } = useCard(id)
  const { profile } = useMyProfile()
  const { cards } = useNearbyCards(profile?.lat ?? null, profile?.lng ?? null, 25, null)
  const { cardIds, items, refresh } = useMyWantlist()

  const onWantlist = cardIds.has(id)
  const holders = cards.filter((c) => c.card_id === id)

  async function toggleWant() {
    if (onWantlist) {
      const item = items.find((w) => w.card_id === id)
      if (item) await removeFromWantlist(item.id)
    } else {
      await addToWantlist(id)
    }
    await refresh()
  }

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerRight: () => (
            <Pressable onPress={toggleWant} hitSlop={8} className="active:opacity-60 px-1">
              <Ionicons name={onWantlist ? 'heart' : 'heart-outline'} size={24} color={onWantlist ? colors.primary : colors.ink} />
            </Pressable>
          ),
        }}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !card ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-muted font-display">Card not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
          {/* Hero */}
          <View className="items-center px-6 pt-2 pb-6">
            <View style={{ shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } }}>
              <CardThumb uri={card.image_url} className="w-[150px] h-[210px]" radius="rounded-xl" />
            </View>
            <Text className="text-ink text-[22px] font-mono-bold mt-4">{card.id}</Text>
            <Text className="text-ink font-display-semibold text-base mt-1 text-center">{card.name}</Text>
            <Text className="text-muted text-sm mt-0.5 font-display">
              {[card.game === 'gundam' ? 'Gundam' : 'One Piece', card.set_name].filter(Boolean).join(' · ')}
            </Text>

            {onWantlist && (
              <View className="flex-row items-center gap-1.5 mt-3 bg-primary/10 border border-primary rounded-lg px-3 py-1.5">
                <Ionicons name="heart" size={13} color={colors.primary} />
                <Text className="text-primary text-xs font-display-medium">On your wantlist</Text>
              </View>
            )}
          </View>

          {/* Available near you */}
          <View className="px-5">
            <MonoLabel className="mb-3">
              AVAILABLE NEAR YOU · {holders.length}
            </MonoLabel>

            {holders.length === 0 ? (
              <View className="bg-surface border border-subtle rounded-2xl px-4 py-5">
                <Text className="text-muted text-sm font-display">No one nearby has this card up for trade.</Text>
                {!onWantlist && (
                  <Pressable onPress={toggleWant} className="mt-3 active:opacity-60">
                    <Text className="text-primary text-sm font-display-medium">Add to wantlist to get matched →</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View className="gap-2">
                {holders.map((h) => (
                  <Pressable
                    key={h.binder_item_id}
                    onPress={() => router.push({ pathname: '/(app)/trader/[handle]', params: { handle: h.owner_handle } })}
                    className="flex-row items-center bg-surface border border-subtle rounded-2xl px-3.5 py-3 active:opacity-70"
                  >
                    <Avatar handle={h.owner_handle} size={38} />
                    <View className="flex-1 ml-3">
                      <Text className="text-ink font-mono text-sm">@{h.owner_handle}</Text>
                      <Text className="text-muted text-xs mt-0.5 font-display">
                        {h.condition}
                        {h.quantity > 1 ? ` · ×${h.quantity}` : ''}
                        {h.is_foil ? ' · ' : ''}
                        {h.is_foil ? <Text className="text-gold font-display-medium">Foil</Text> : ''}
                        {'  ·  '}{distanceLabel(h)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1 bg-primary/10 border border-primary rounded-lg px-3 py-1.5">
                      <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                      <Text className="text-primary text-xs font-display-semibold">View</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  )
}
