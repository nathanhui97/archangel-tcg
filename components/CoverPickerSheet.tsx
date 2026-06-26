import { View, Text, Modal, Pressable, Image, ScrollView, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/lib/theme'
import type { BinderItem } from '@/types'

const CARD_RATIO = 5 / 7

type Props = {
  visible: boolean
  onClose: () => void
  items: BinderItem[]
  currentCoverId: string | null
  onPick: (cardId: string) => void
}

/** Bottom sheet: choose which of the binder's cards is the cover. */
export function CoverPickerSheet({ visible, onClose, items, currentCoverId, onPick }: Props) {
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
          style={{ paddingBottom: insets.bottom + 16, maxHeight: '80%' }}
        >
          <View className="self-center w-9 h-1 rounded-full bg-track mb-4" />
          <Text className="text-ink text-lg font-display-bold mb-1">Choose cover</Text>
          <Text className="text-muted text-sm font-display mb-4">Pick a card from this binder.</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {items.map((item) => {
                const selected = item.card_id === currentCoverId
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      onPick(item.card_id)
                      onClose()
                    }}
                    style={{ width: tileW }}
                    className="active:opacity-80 mb-1"
                  >
                    <View
                      style={{ width: tileW, height: tileH }}
                      className={`rounded-lg overflow-hidden bg-surface-raised border ${selected ? 'border-2 border-primary' : 'border-subtle'}`}
                    >
                      {item.card?.image_url ? (
                        <Image source={{ uri: item.card.image_url }} resizeMode="cover" className="w-full h-full" />
                      ) : null}
                      {selected ? (
                        <View className="absolute inset-0 bg-primary/20 items-center justify-center">
                          <View className="w-7 h-7 rounded-full bg-primary items-center justify-center">
                            <Ionicons name="checkmark" size={18} color={colors.primaryInk} />
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
