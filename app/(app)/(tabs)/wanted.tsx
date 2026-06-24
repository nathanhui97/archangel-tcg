import { useState, useMemo } from 'react'
import {
  View, Text, FlatList, TextInput, Pressable,
  ActivityIndicator, Image, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMyProfile } from '@/lib/profile'
import { useNearbyWantlists } from '@/lib/nearby'
import type { Game, NearbyWantlistItem } from '@/types'

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const
const GAME_OPTIONS: { label: string; value: Game | null }[] = [
  { label: 'All', value: null },
  { label: 'Gundam', value: 'gundam' },
  { label: 'One Piece', value: 'one_piece' },
]

type CardGroup = {
  card_id: string
  card_name: string
  card_image_url: string | null
  card_set_code: string | null
  card_number: string | null
  card_game: Game
  wanters: { handle: string; distance_km: number | null }[]
}

function groupByCard(items: NearbyWantlistItem[]): CardGroup[] {
  const map = new Map<string, CardGroup>()
  for (const item of items) {
    if (!map.has(item.card_id)) {
      map.set(item.card_id, {
        card_id: item.card_id,
        card_name: item.card_name,
        card_image_url: item.card_image_url,
        card_set_code: item.card_set_code,
        card_number: item.card_number,
        card_game: item.card_game,
        wanters: [],
      })
    }
    map.get(item.card_id)!.wanters.push({
      handle: item.wanter_handle,
      distance_km: item.distance_km,
    })
  }
  return Array.from(map.values())
}

function WantedCardRow({ group }: { group: CardGroup }) {
  const topWanters = group.wanters.slice(0, 3)
  const extra = group.wanters.length - topWanters.length

  return (
    <View className="flex-row items-center px-4 py-3 border-b border-gray-800">
      {group.card_image_url ? (
        <Image
          source={{ uri: group.card_image_url }}
          className="w-10 h-14 rounded mr-3 bg-gray-800"
          resizeMode="cover"
        />
      ) : (
        <View className="w-10 h-14 rounded mr-3 bg-gray-800" />
      )}
      <View className="flex-1">
        <Text className="text-white font-semibold text-sm" numberOfLines={1}>
          {group.card_name}
        </Text>
        <Text className="text-gray-500 text-xs mt-0.5">
          {[group.card_set_code, group.card_number].filter(Boolean).join('-')}
        </Text>
        <View className="flex-row flex-wrap mt-1.5 gap-1">
          {topWanters.map((w, i) => (
            <View key={i} className="flex-row items-center bg-gray-800 rounded px-2 py-0.5">
              <Text className="text-indigo-400 text-xs">@{w.handle}</Text>
              {w.distance_km !== null && (
                <Text className="text-gray-500 text-xs ml-1">· {w.distance_km} km</Text>
              )}
              {w.distance_km === null && (
                <Text className="text-gray-500 text-xs ml-1">· ships</Text>
              )}
            </View>
          ))}
          {extra > 0 && (
            <View className="bg-gray-800 rounded px-2 py-0.5">
              <Text className="text-gray-400 text-xs">+{extra} more</Text>
            </View>
          )}
        </View>
      </View>
      <View className="ml-2 bg-gray-800 rounded-full w-8 h-8 items-center justify-center">
        <Text className="text-white text-xs font-bold">{group.wanters.length}</Text>
      </View>
    </View>
  )
}

export default function WantedScreen() {
  const { profile, loading: profileLoading } = useMyProfile()
  const [radiusKm, setRadiusKm] = useState(25)
  const [game, setGame] = useState<Game | null>(null)
  const [search, setSearch] = useState('')

  const { items, loading, error, refresh } = useNearbyWantlists(
    profile?.lat ?? null,
    profile?.lng ?? null,
    radiusKm,
    game
  )

  const groups = useMemo(() => {
    const all = groupByCard(items)
    if (!search.trim()) return all
    const q = search.toLowerCase()
    return all.filter(g => g.card_name.toLowerCase().includes(q))
  }, [items, search])

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
          placeholder="Search wanted cards..."
          placeholderTextColor="#6b7280"
          className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-800"
        />
      </View>

      {noLocation && (
        <View className="mx-4 mb-2 bg-amber-900/40 border border-amber-700/50 rounded-xl px-4 py-3">
          <Text className="text-amber-400 text-xs">
            Set your location in Profile to see local demand. Showing shippers only.
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
          data={groups}
          keyExtractor={g => g.card_id}
          renderItem={({ item }) => <WantedCardRow group={item} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#6366f1" />}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-gray-500 text-sm">No one nearby is looking for cards.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
