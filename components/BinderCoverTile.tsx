import { View, Text, Image, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusDot } from '@/components/ui'
import { colors } from '@/lib/theme'

/** 2×2 collage of the binder's card images (auto-derived cover). */
function Cover({ urls, size }: { urls: string[]; size: number }) {
  if (urls.length === 0) {
    return (
      <View style={{ height: size }} className="bg-surface-raised items-center justify-center">
        <Ionicons name="albums-outline" size={26} color={colors.faint2} />
      </View>
    )
  }
  return (
    <View style={{ height: size }} className="flex-row flex-wrap bg-surface-raised">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: '50%', height: '50%' }} className="p-[1px]">
          {urls[i] ? (
            <Image source={{ uri: urls[i] }} resizeMode="cover" className="w-full h-full" />
          ) : (
            <View className="w-full h-full bg-surface" />
          )}
        </View>
      ))}
    </View>
  )
}

type Props = {
  width: number
  name: string
  itemCount: number
  isPublic: boolean
  coverUrls: string[]
  onPress?: () => void
  onLongPress?: () => void
}

export function BinderCoverTile({ width, name, itemCount, isPublic, coverUrls, onPress, onLongPress }: Props) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width }} className="active:opacity-80">
      <View className="rounded-xl overflow-hidden border border-subtle">
        <Cover urls={coverUrls} size={width} />
      </View>
      <Text className="text-ink font-display-semibold text-sm mt-2" numberOfLines={1}>{name}</Text>
      <View className="flex-row items-center justify-between mt-0.5">
        <Text className="text-muted text-xs font-display">{itemCount} card{itemCount !== 1 ? 's' : ''}</Text>
        <StatusDot on={isPublic} label={isPublic ? 'Public' : 'Private'} />
      </View>
    </Pressable>
  )
}

/** Dashed "create" tile that matches the cover-tile footprint. */
export function NewBinderTile({ width, label, onPress }: { width: number; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width }} className="active:opacity-70">
      <View
        style={{ height: width }}
        className="rounded-xl border border-dashed border-subtle items-center justify-center"
      >
        <Ionicons name="add" size={28} color={colors.primary} />
        <Text className="text-primary text-xs font-display-medium mt-1">{label}</Text>
      </View>
    </Pressable>
  )
}
