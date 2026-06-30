import { useMemo } from 'react'
import { View, Text, FlatList, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useNearbyWantlists } from '@/lib/nearby'
import type { Game, NearbyWantlistItem } from '@/types'
import { CardTile, gridTileWidth } from '@/components/ui/CardTile'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { colors } from '@/lib/theme'

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
    map.get(item.card_id)!.wanters.push({ handle: item.wanter_handle, distance_km: item.distance_km })
  }
  return Array.from(map.values())
}

function cardCode(g: CardGroup): string {
  return [g.card_set_code, g.card_number].filter(Boolean).join('-') || g.card_id
}

/** Nearest wanter (closest first). */
function nearestWanter(g: CardGroup) {
  return [...g.wanters].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))[0] ?? null
}

/** Shared distance format, matching ListedForTradeList: "1.2 km" / "Ships". */
function distanceLabel(km: number | null): string {
  return km !== null ? `${km} km` : 'Ships'
}

type Props = {
  lat: number | null
  lng: number | null
  radiusKm: number
  game: Game | null
  search: string
}

/** The "Wishlist" segment: cards nearby traders are hunting, as a 3-col grid. */
export function WishlistList({ lat, lng, radiusKm, game, search }: Props) {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const tileW = gridTileWidth(width)
  const { items, loading, error, refresh } = useNearbyWantlists(lat, lng, radiusKm, game)

  const groups = useMemo(() => {
    const all = groupByCard(items)
    if (!search.trim()) return all
    const q = search.toLowerCase()
    return all.filter((g) => g.card_name.toLowerCase().includes(q) || cardCode(g).toLowerCase().includes(q))
  }, [items, search])

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }
  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-danger text-sm text-center font-display">{error}</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={groups}
      keyExtractor={(g) => g.card_id}
      numColumns={3}
      columnWrapperStyle={{ gap: 10, paddingHorizontal: 20 }}
      contentContainerStyle={{ gap: 14, paddingTop: 8, paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
      renderItem={({ item }) => {
        const n = nearestWanter(item)
        return (
          <CardTile
            width={tileW}
            uri={item.card_image_url}
            topRight={
              <View className="bg-primary rounded px-1.5 py-0.5">
                <Text className="text-primary-ink font-mono-bold text-[10px]">{item.wanters.length} want</Text>
              </View>
            }
            title={n ? `@${n.handle}` : ''}
            titleClassName="text-muted-2 font-mono text-[11px]"
            subtitle={n ? distanceLabel(n.distance_km) : undefined}
            onPress={() => router.push({ pathname: '/(app)/card/[id]', params: { id: item.card_id } })}
          />
        )
      }}
      ListEmptyComponent={
        <View className="items-center pt-16 px-8">
          <RadarLogo size={120} animated />
          <Text className="text-ink font-display-semibold text-base mt-6">No wantlists nearby</Text>
          <Text className="text-muted text-sm mt-2 text-center font-display">
            No one within {radiusKm} km is hunting cards yet. Widen your range to see more demand.
          </Text>
        </View>
      }
    />
  )
}
