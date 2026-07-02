import { View, Text, Image, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '@/components/ui'
import { formatPrice } from '@/lib/prices'
import { colors } from '@/lib/theme'
import type { NearbyBinder } from '@/types'

const CARD_RATIO = 5 / 7

function distanceLabel(b: NearbyBinder): string {
  if (b.distance_km !== null) return `${b.distance_km} km`
  if (b.owner_willing_to_ship) return 'Ships'
  return 'Nearby'
}

/** One nearby public binder: cover + owner + count, tap to view. */
export function NearbyBinderRow({ binder, onPress }: { binder: NearbyBinder; onPress: () => void }) {
  const coverW = 52
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center bg-surface border border-subtle rounded-2xl mx-4 mb-2.5 px-3.5 py-3 active:opacity-80"
    >
      <View
        style={{ width: coverW, height: coverW / CARD_RATIO }}
        className="rounded-lg overflow-hidden bg-surface-raised border border-subtle"
      >
        {binder.cover_image_url ? (
          <Image source={{ uri: binder.cover_image_url }} resizeMode="cover" className="w-full h-full" />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="albums-outline" size={18} color={colors.faint2} />
          </View>
        )}
      </View>

      <View className="flex-1 ml-3">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-ink font-display-semibold text-sm" numberOfLines={1}>{binder.name}</Text>
          {binder.binder_verified_at ? <Ionicons name="shield-checkmark" size={13} color={colors.primary} /> : null}
        </View>
        <View className="flex-row items-center gap-1 mt-1">
          <Avatar handle={binder.owner_handle} size={16} />
          <Text className="text-muted text-xs font-mono ml-0.5">@{binder.owner_handle}</Text>
          {binder.owner_verified_at ? <Ionicons name="checkmark-circle" size={11} color={colors.primary} /> : null}
        </View>
        {binder.total_value != null && binder.total_value > 0 ? (
          <View className="flex-row items-center gap-1 mt-1">
            <Ionicons name="pricetag" size={10} color={colors.primary} />
            <Text className="text-primary font-mono-bold text-[11px]">≈ {formatPrice(binder.total_value)}</Text>
          </View>
        ) : null}
      </View>

      <View className="items-end ml-2">
        <Text className="text-ink font-mono-bold text-xs">{binder.item_count}</Text>
        <Text className="text-faint text-[10px] font-display">cards</Text>
        <Text className="text-primary font-mono text-[11px] mt-1">{distanceLabel(binder)}</Text>
      </View>
    </Pressable>
  )
}
