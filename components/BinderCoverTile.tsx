import { View, Text, Image, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusDot } from '@/components/ui'
import { colors } from '@/lib/theme'

const CARD_RATIO = 5 / 7

type Props = {
  width: number
  name: string
  itemCount: number
  isPublic: boolean
  coverUrl: string | null
  onPress?: () => void
  onLongPress?: () => void
}

/** A binder represented by its cover card (portrait), with name + count + status. */
export function BinderCoverTile({ width, name, itemCount, isPublic, coverUrl, onPress, onLongPress }: Props) {
  const height = width / CARD_RATIO
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width }} className="active:opacity-80">
      <View style={{ width, height }} className="relative">
        {/* Subtle stacked-card edge behind, so it reads as a binder, not a single card. */}
        <View
          className="absolute rounded-xl bg-surface-raised border border-subtle"
          style={{ left: 6, right: 6, top: 6, bottom: -6 }}
        />
        <View
          style={{ width, height }}
          className="rounded-xl overflow-hidden bg-surface-raised border border-subtle"
        >
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} resizeMode="cover" className="w-full h-full" />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Ionicons name="albums-outline" size={26} color={colors.faint2} />
            </View>
          )}
        </View>
      </View>

      <Text className="text-ink font-display-semibold text-sm mt-3" numberOfLines={1}>{name}</Text>
      <View className="flex-row items-center justify-between mt-0.5">
        <Text className="text-muted text-xs font-display">{itemCount} card{itemCount !== 1 ? 's' : ''}</Text>
        <StatusDot on={isPublic} label={isPublic ? 'Public' : 'Private'} />
      </View>
    </Pressable>
  )
}

/** Dashed "create" tile that matches the cover-tile footprint (portrait). */
export function NewBinderTile({ width, label, onPress }: { width: number; label: string; onPress?: () => void }) {
  const height = width / CARD_RATIO
  return (
    <Pressable onPress={onPress} style={{ width }} className="active:opacity-70">
      <View
        style={{ height }}
        className="rounded-xl border border-dashed border-subtle items-center justify-center"
      >
        <Ionicons name="add" size={28} color={colors.primary} />
        <Text className="text-primary text-xs font-display-medium mt-1">{label}</Text>
      </View>
    </Pressable>
  )
}
