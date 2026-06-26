import { ReactNode } from 'react'
import { View, Text, Image, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/lib/theme'

/** Trading-card aspect ratio (width : height). */
const CARD_RATIO = 5 / 7

type Props = {
  uri?: string | null
  /** Tile width in px; image height is derived from the card aspect ratio. */
  width: number
  /** Badge(s) pinned to the top-right of the image (e.g. ×qty, foil). */
  topRight?: ReactNode
  /** Badge pinned to the top-left of the image (e.g. WANT). */
  topLeft?: ReactNode
  /** Primary caption under the image. */
  title?: string
  /** Secondary caption under the image. */
  subtitle?: ReactNode
  /** Tailwind classes for the title text. */
  titleClassName?: string
  /** Multi-select state: green ring + check overlay, dims unselected look. */
  selected?: boolean
  onPress?: () => void
  onLongPress?: () => void
}

/** A single card in a grid: full-size card image + overlay badges + captions. */
export function CardTile({
  uri, width, topRight, topLeft, title, subtitle, titleClassName = 'text-ink font-mono-bold text-xs', selected, onPress, onLongPress,
}: Props) {
  const height = width / CARD_RATIO
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width }} className="active:opacity-80">
      <View
        style={{ width, height }}
        className={`rounded-lg overflow-hidden bg-surface-raised border ${selected ? 'border-2 border-primary' : 'border-subtle'}`}
      >
        {uri ? (
          <Image source={{ uri }} resizeMode="cover" className="w-full h-full" />
        ) : null}
        {topRight ? <View className="absolute top-1 right-1 flex-row items-center gap-1">{topRight}</View> : null}
        {topLeft ? <View className="absolute top-1 left-1">{topLeft}</View> : null}
        {selected ? (
          <View className="absolute inset-0 bg-primary/20 items-center justify-center">
            <View className="w-7 h-7 rounded-full bg-primary items-center justify-center">
              <Ionicons name="checkmark" size={18} color={colors.primaryInk} />
            </View>
          </View>
        ) : null}
      </View>
      {title ? (
        <Text className={`mt-1.5 ${titleClassName}`} numberOfLines={1}>{title}</Text>
      ) : null}
      {subtitle ? (
        typeof subtitle === 'string'
          ? <Text className="text-muted text-[11px] font-display" numberOfLines={1}>{subtitle}</Text>
          : <View className="mt-0.5">{subtitle}</View>
      ) : null}
    </Pressable>
  )
}

/** Compute tile width for an N-column grid given screen width, horizontal padding, and gap. */
export function gridTileWidth(screenWidth: number, columns = 3, padding = 20, gap = 10): number {
  return (screenWidth - padding * 2 - gap * (columns - 1)) / columns
}
