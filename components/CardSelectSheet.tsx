import { View, Text, Modal, Pressable, Image, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/lib/theme'
import type { TradeCard } from '@/lib/binders'

const CARD_RATIO = 5 / 7

type Props = {
  visible: boolean
  onClose: () => void
  title: string
  emptyText: string
  loading?: boolean
  cards: TradeCard[]
  selectedIds: Set<string>
  onToggle: (card: TradeCard) => void
}

/** Bottom sheet to multi-select cards (from a binder) for a trade proposal. */
export function CardSelectSheet({ visible, onClose, title, emptyText, loading, cards, selectedIds, onToggle }: Props) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const cols = 3
  const gap = 10
  const padding = 24
  const tileW = (width - padding * 2 - gap * (cols - 1)) / cols
  const tileH = tileW / CARD_RATIO

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(2,4,3,0.55)' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-sheet rounded-t-[26px] border-t border-primary-soft px-6 pt-3"
          style={{ paddingBottom: insets.bottom + 16, maxHeight: '82%' }}
        >
          <View className="self-center w-9 h-1 rounded-full bg-track mb-4" />
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-ink text-lg font-display-bold">{title}</Text>
            <Pressable onPress={onClose} className="active:opacity-60">
              <Text className="text-primary font-display-semibold text-base">Done</Text>
            </Pressable>
          </View>

          {loading ? (
            <View className="py-16 items-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : cards.length === 0 ? (
            <View className="items-center py-14 px-6">
              <Text className="text-muted text-sm text-center font-display">{emptyText}</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
                {cards.map((c) => {
                  const selected = selectedIds.has(c.id)
                  return (
                    <Pressable key={c.id} onPress={() => onToggle(c)} style={{ width: tileW }} className="active:opacity-80 mb-2">
                      <View
                        style={{ width: tileW, height: tileH }}
                        className={`rounded-lg overflow-hidden bg-surface-raised border ${selected ? 'border-2 border-primary' : 'border-subtle'}`}
                      >
                        {c.image_url ? <Image source={{ uri: c.image_url }} resizeMode="cover" className="w-full h-full" /> : null}
                        <View className="absolute top-1 left-1 bg-bg/80 rounded px-1">
                          <Text className="text-muted-2 font-mono-bold text-[8px]">{c.condition}{c.is_foil ? ' ✦' : ''}</Text>
                        </View>
                        {selected ? (
                          <View className="absolute inset-0 bg-primary/20 items-center justify-center">
                            <View className="w-7 h-7 rounded-full bg-primary items-center justify-center">
                              <Ionicons name="checkmark" size={18} color={colors.primaryInk} />
                            </View>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-muted-2 font-mono text-[9px] mt-1" numberOfLines={1}>{c.card_id}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
