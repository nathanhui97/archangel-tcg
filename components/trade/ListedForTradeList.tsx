import { useMemo } from 'react'
import { View, Text, FlatList, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useNearbyCards } from '@/lib/nearby'
import type { Game, NearbyCard } from '@/types'
import { Badge } from '@/components/ui'
import { CardTile, gridTileWidth } from '@/components/ui/CardTile'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { colors } from '@/lib/theme'

function cardCode(item: { card_set_code: string | null; card_number: string | null; card_id: string }): string {
  return [item.card_set_code, item.card_number].filter(Boolean).join('-') || item.card_id
}

function distanceLabel(item: NearbyCard): string {
  if (item.distance_km !== null) return `${item.distance_km} km`
  if (item.owner_willing_to_ship) return 'Ships'
  return '—'
}

type Props = {
  lat: number | null
  lng: number | null
  radiusKm: number
  game: Game | null
  search: string
  art: 'alt' | 'base' | null
  color: string | null
  cardType: string | null
  wantedIds: Set<string>
}

/** The "Listed for Trade" segment: nearby cards available to trade, as a 3-col grid. */
export function ListedForTradeList({ lat, lng, radiusKm, game, search, art, color, cardType, wantedIds }: Props) {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const tileW = gridTileWidth(width)
  const { cards, loading, error, refresh } = useNearbyCards(lat, lng, radiusKm, game)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cards.filter((c) => {
      if (q && !(c.card_name.toLowerCase().includes(q) || cardCode(c).toLowerCase().includes(q))) return false
      if (art === 'alt' && !c.card_is_alt_art) return false
      if (art === 'base' && c.card_is_alt_art) return false
      if (color && c.card_color !== color) return false
      if (cardType && c.card_type !== cardType) return false
      return true
    })
  }, [cards, search, art, color, cardType])

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
      data={filtered}
      keyExtractor={(item) => item.binder_item_id}
      numColumns={3}
      columnWrapperStyle={{ gap: 10, paddingHorizontal: 20 }}
      contentContainerStyle={{ gap: 14, paddingTop: 8, paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <CardTile
          width={tileW}
          uri={item.card_image_url}
          topLeft={wantedIds.has(item.card_id) ? <Badge label="WANT" tone="want" /> : undefined}
          topRight={item.is_foil ? <Text className="text-gold text-[11px]">✦</Text> : undefined}
          title={`@${item.owner_handle}`}
          titleClassName="text-muted-2 font-mono text-[11px]"
          subtitle={distanceLabel(item)}
          onPress={() => router.push({ pathname: '/(app)/card/[id]', params: { id: item.card_id } })}
        />
      )}
      ListEmptyComponent={
        <View className="items-center pt-16 px-8">
          <RadarLogo size={120} animated />
          <Text className="text-ink font-display-semibold text-base mt-6">No trades within {radiusKm} km</Text>
          <Text className="text-muted text-sm mt-2 text-center font-display">
            Nobody nearby has cards up yet. Widen your range or include traders who ship.
          </Text>
          <View className="flex-row items-center gap-1.5 mt-4">
            <Ionicons name="cube-outline" size={13} color={colors.faint} />
            <Text className="text-faint text-xs font-display">Tip: widen your distance in Filters</Text>
          </View>
        </View>
      }
    />
  )
}
