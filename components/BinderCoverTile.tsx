import { View, Text, Image, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PressRow, StatusDot } from '@/components/ui'
import { colors } from '@/lib/theme'
import type { RarityCount } from '@/lib/binders'

const CARD_RATIO = 5 / 7
const COVER_W = 56
const MAX_CHIPS = 4
// Rarities worth highlighting in green.
const HIGH = new Set(['SEC', 'SP', 'LR++', 'LR+', 'LR', 'L', 'SR'])

type Props = {
  name: string
  itemCount: number
  isPublic: boolean
  coverUrl: string | null
  rarities: RarityCount[]
  onPress?: () => void
  onLongPress?: () => void
}

/** Horizontal binder row: cover on the left, name + count + rarity breakdown on the right. */
export function BinderRow({ name, itemCount, isPublic, coverUrl, rarities, onPress, onLongPress }: Props) {
  const coverH = COVER_W / CARD_RATIO
  const shown = rarities.slice(0, MAX_CHIPS)
  const extra = rarities.length - shown.length

  return (
    <PressRow onPress={onPress} onLongPress={onLongPress} className="flex-row items-center p-3">
      <View
        style={{ width: COVER_W, height: coverH }}
        className="rounded-lg overflow-hidden bg-surface-raised border border-subtle"
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} resizeMode="cover" className="w-full h-full" />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="albums-outline" size={20} color={colors.faint2} />
          </View>
        )}
      </View>

      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text className="text-ink font-display-semibold text-base flex-1 pr-2" numberOfLines={1}>{name}</Text>
          <StatusDot on={isPublic} label={isPublic ? 'Public' : 'Private'} />
        </View>

        <Text className="text-muted text-xs font-display mt-0.5">
          {itemCount} card{itemCount !== 1 ? 's' : ''}
        </Text>

        {rarities.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {shown.map((r) => {
              const high = HIGH.has(r.rarity)
              return (
                <View
                  key={r.rarity}
                  className={`rounded px-1.5 py-0.5 border ${high ? 'bg-primary/10 border-primary-soft' : 'bg-surface-control border-subtle'}`}
                >
                  <Text className={`font-mono-bold text-[10px] ${high ? 'text-primary' : 'text-muted-2'}`}>
                    {r.rarity} {r.count}
                  </Text>
                </View>
              )
            })}
            {extra > 0 && (
              <View className="rounded px-1.5 py-0.5 justify-center">
                <Text className="text-faint-2 font-mono text-[10px]">+{extra}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </PressRow>
  )
}

/** Dashed "create" row matching the binder-row footprint. */
export function NewBinderRow({ label, onPress }: { label: string; onPress?: () => void }) {
  const coverH = COVER_W / CARD_RATIO
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center p-3 rounded-2xl border border-dashed border-subtle active:opacity-70"
    >
      <View
        style={{ width: COVER_W, height: coverH }}
        className="rounded-lg border border-dashed border-subtle items-center justify-center"
      >
        <Ionicons name="add" size={22} color={colors.primary} />
      </View>
      <Text className="text-primary font-display-medium text-base ml-3">{label}</Text>
    </Pressable>
  )
}
