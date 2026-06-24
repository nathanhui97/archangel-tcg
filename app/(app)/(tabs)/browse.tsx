import { useState, useMemo } from 'react'
import {
  View, Text, FlatList, TextInput, Pressable,
  ActivityIndicator, Image, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMyProfile } from '@/lib/profile'
import { useNearbyCards } from '@/lib/nearby'
import { useMyWantlist } from '@/lib/wantlist'
import type { Game, NearbyCard } from '@/types'

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const
const GAME_OPTIONS: { label: string; value: Game | null }[] = [
  { label: 'All', value: null },
  { label: 'Gundam', value: 'gundam' },
  { label: 'One Piece', value: 'one_piece' },
]

function distanceLabel(km: number | null, willingToShip: boolean): string {
  if (km !== null) return `${km} km`
  if (willingToShip) return 'Ships anywhere'
  return '—'
}

function CardRow({ item, isWanted }: { item: NearbyCard; isWanted: boolean }) {
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-gray-800">
      {item.card_image_url ? (
        <Image
          source={{ uri: item.card_image_url }}
          className="w-10 h-14 rounded mr-3 bg-gray-800"
          resizeMode="cover"
        />
      ) : (
        <View className="w-10 h-14 rounded mr-3 bg-gray-800" />
      )}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-white font-semibold text-sm flex-shrink" numberOfLines={1}>
            {item.card_name}
          </Text>
          {isWanted && (
            <View className="bg-indigo-600 rounded px-1.5 py-0.5">
              <Text className="text-white text-xs font-medium">Want</Text>
            </View>
          )}
        </View>
        <Text className="text-gray-500 text-xs mt-0.5">
          {[item.card_set_code, item.card_number].filter(Boolean).join('-')}
          {item.is_foil ? '  ✦ Foil' : ''}
          {'  ' + item.condition}
          {item.quantity > 1 ? `  ×${item.quantity}` : ''}
        </Text>
        <View className="flex-row items-center mt-1 gap-2">
          <Text className="text-indigo-400 text-xs">@{item.owner_handle}</Text>
          <Text className="text-gray-600 text-xs">·</Text>
          <Text className="text-gray-500 text-xs">
            {distanceLabel(item.distance_km, item.owner_willing_to_ship)}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default function BrowseScreen() {
  const { profile, loading: profileLoading } = useMyProfile()
  const [radiusKm, setRadiusKm] = useState(25)
  const [game, setGame] = useState<Game | null>(null)
  const [search, setSearch] = useState('')

  const { cards, loading, error, refresh } = useNearbyCards(
    profile?.lat ?? null,
    profile?.lng ?? null,
    radiusKm,
    game
  )
  const { cardIds: wantedIds } = useMyWantlist()

  const filtered = useMemo(() => {
    if (!search.trim()) return cards
    const q = search.toLowerCase()
    return cards.filter(c => c.card_name.toLowerCase().includes(q))
  }, [cards, search])

  const noLocation = !profileLoading && !profile?.lat

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      {/* Game filter */}
      <View className="flex-row px-4 pt-3 gap-2">
        {GAME_OPTIONS.map(opt => (
          <Pressable
            key={String(opt.value)}
            onPress={() => setGame(opt.value)}
            className={`px-3 py-1.5 rounded-full border ${
              game === opt.value
                ? 'bg-indigo-600 border-indigo-600'
                : 'border-gray-700 bg-gray-900'
            }`}
          >
            <Text className={`text-xs font-medium ${game === opt.value ? 'text-white' : 'text-gray-400'}`}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Radius chips */}
      <View className="flex-row px-4 pt-2 gap-2">
        {RADIUS_OPTIONS.map(r => (
          <Pressable
            key={r}
            onPress={() => setRadiusKm(r)}
            className={`px-3 py-1.5 rounded-full border ${
              radiusKm === r
                ? 'bg-indigo-600 border-indigo-600'
                : 'border-gray-700 bg-gray-900'
            }`}
          >
            <Text className={`text-xs font-medium ${radiusKm === r ? 'text-white' : 'text-gray-400'}`}>
              {r} km
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View className="px-4 pt-3 pb-2">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search cards..."
          placeholderTextColor="#6b7280"
          className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-800"
        />
      </View>

      {/* No location banner */}
      {noLocation && (
        <View className="mx-4 mb-2 bg-amber-900/40 border border-amber-700/50 rounded-xl px-4 py-3">
          <Text className="text-amber-400 text-xs">
            Set your location in Profile to see local traders. Showing shippers only.
          </Text>
        </View>
      )}

      {loading || profileLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-400 text-sm text-center">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.binder_item_id}
          renderItem={({ item }) => (
            <CardRow item={item} isWanted={wantedIds.has(item.card_id)} />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#6366f1" />}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-gray-500 text-sm">No cards available in this area.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
