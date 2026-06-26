import { View, Text, Image, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusDot } from '@/components/ui'
import { colors } from '@/lib/theme'

// Binders are chunkier than a single card — a touch taller than wide.
const BINDER_RATIO = 1.18

type Props = {
  width: number
  name: string
  itemCount: number
  isPublic: boolean
  coverUrl: string | null
  onPress?: () => void
  onLongPress?: () => void
}

/** A binder drawn as a closed 3-ring binder: a spine with ring holes + cover art. */
export function BinderCoverTile({ width, name, itemCount, isPublic, coverUrl, onPress, onLongPress }: Props) {
  const height = width * BINDER_RATIO
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width }} className="active:opacity-80">
      <View
        style={{ width, height }}
        className="flex-row rounded-xl overflow-hidden border border-subtle bg-surface-raised"
      >
        {/* Ring spine */}
        <View className="w-4 bg-surface border-r border-subtle items-center justify-around py-4">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="w-[7px] h-[7px] rounded-full bg-bg border border-subtle" />
          ))}
        </View>

        {/* Cover art fills the front */}
        <View className="flex-1">
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} resizeMode="cover" className="w-full h-full" />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Ionicons name="albums-outline" size={26} color={colors.faint2} />
            </View>
          )}
          {/* faint sheen down the binder cover */}
          <View className="absolute top-0 left-0 bottom-0 w-1/3 bg-ink/5" />
        </View>
      </View>

      <Text className="text-ink font-display-semibold text-sm mt-2.5" numberOfLines={1}>{name}</Text>
      <View className="flex-row items-center justify-between mt-0.5">
        <Text className="text-muted text-xs font-display">{itemCount} card{itemCount !== 1 ? 's' : ''}</Text>
        <StatusDot on={isPublic} label={isPublic ? 'Public' : 'Private'} />
      </View>
    </Pressable>
  )
}

/** Dashed "create" tile matching the binder footprint, with a hint of a spine. */
export function NewBinderTile({ width, label, onPress }: { width: number; label: string; onPress?: () => void }) {
  const height = width * BINDER_RATIO
  return (
    <Pressable onPress={onPress} style={{ width }} className="active:opacity-70">
      <View
        style={{ height }}
        className="flex-row rounded-xl border border-dashed border-subtle overflow-hidden"
      >
        <View className="w-4 border-r border-dashed border-subtle items-center justify-around py-4">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="w-[7px] h-[7px] rounded-full border border-subtle" />
          ))}
        </View>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="add" size={28} color={colors.primary} />
          <Text className="text-primary text-xs font-display-medium mt-1">{label}</Text>
        </View>
      </View>
    </Pressable>
  )
}
