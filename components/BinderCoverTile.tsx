import { View, Text, Image, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusDot } from '@/components/ui'
import { colors } from '@/lib/theme'

// Binder body is a touch taller than wide; a name tab sits on top.
const BINDER_RATIO = 1.12

type Props = {
  width: number
  name: string
  itemCount: number
  isPublic: boolean
  coverUrl: string | null
  onPress?: () => void
  onLongPress?: () => void
}

/** A binder drawn as a labeled portfolio: a name tab on top + cover art body. */
export function BinderCoverTile({ width, name, itemCount, isPublic, coverUrl, onPress, onLongPress }: Props) {
  const height = width * BINDER_RATIO
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width }} className="active:opacity-80">
      {/* Name tab */}
      <View className="self-start ml-3 z-10" style={{ maxWidth: width - 24 }}>
        <View className="bg-surface-control border border-subtle border-b-0 rounded-t-lg px-3 pt-1 pb-1.5">
          <Text className="text-ink font-display-semibold text-xs" numberOfLines={1}>{name}</Text>
        </View>
      </View>

      {/* Cover art body */}
      <View
        style={{ height, marginTop: -1 }}
        className="rounded-xl rounded-tl-none overflow-hidden border border-subtle bg-surface-raised"
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} resizeMode="cover" className="w-full h-full" />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="albums-outline" size={26} color={colors.faint2} />
          </View>
        )}
        {/* faint sheen down the cover */}
        <View className="absolute top-0 left-0 bottom-0 w-1/3 bg-ink/5" />
      </View>

      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-muted text-xs font-display">{itemCount} card{itemCount !== 1 ? 's' : ''}</Text>
        <StatusDot on={isPublic} label={isPublic ? 'Public' : 'Private'} />
      </View>
    </Pressable>
  )
}

/** Dashed "create" tile matching the tabbed-binder footprint. */
export function NewBinderTile({ width, label, onPress }: { width: number; label: string; onPress?: () => void }) {
  const height = width * BINDER_RATIO
  return (
    <Pressable onPress={onPress} style={{ width }} className="active:opacity-70">
      <View className="self-start ml-3 z-10">
        <View className="border border-dashed border-subtle border-b-0 rounded-t-lg px-3 pt-1 pb-1.5">
          <Text className="text-primary font-display-medium text-xs">New</Text>
        </View>
      </View>
      <View
        style={{ height, marginTop: -1 }}
        className="rounded-xl rounded-tl-none border border-dashed border-subtle items-center justify-center"
      >
        <Ionicons name="add" size={28} color={colors.primary} />
        <Text className="text-primary text-xs font-display-medium mt-1">{label}</Text>
      </View>
    </Pressable>
  )
}
