import { View, Text, Modal, Pressable, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Chip, MonoLabel } from '@/components/ui'

export type CardFilters = {
  setCode: string | null
  color: string | null
  cardType: string | null
  altArtOnly: boolean
}

type Props = {
  visible: boolean
  onClose: () => void
  sets: { code: string; name: string }[]
  colors: string[]
  cardTypes: string[]
  value: CardFilters
  onChange: (next: CardFilters) => void
}

function FilterGroup({
  label, options, selected, onSelect, mono,
}: {
  label: string
  options: { key: string; label: string }[]
  selected: string | null
  onSelect: (key: string | null) => void
  mono?: boolean
}) {
  if (options.length === 0) return null
  return (
    <View className="mb-5">
      <MonoLabel className="mb-2.5">{label}</MonoLabel>
      <View className="flex-row flex-wrap gap-2">
        <Chip label="All" active={selected === null} onPress={() => onSelect(null)} mono={mono} />
        {options.map((o) => (
          <Chip key={o.key} label={o.label} active={selected === o.key} onPress={() => onSelect(o.key)} mono={mono} />
        ))}
      </View>
    </View>
  )
}

/** Bottom sheet for filtering the card catalog by set, color, and card type. */
export function CardFilterSheet({ visible, onClose, sets, colors, cardTypes, value, onChange }: Props) {
  const insets = useSafeAreaInsets()
  const activeCount = [value.setCode, value.color, value.cardType, value.altArtOnly || null].filter(Boolean).length

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(2,4,3,0.55)' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-sheet rounded-t-[26px] border-t border-primary-soft px-6 pt-3"
          style={{ paddingBottom: insets.bottom + 16, maxHeight: '80%' }}
        >
          <View className="self-center w-9 h-1 rounded-full bg-track mb-5" />

          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-ink text-lg font-display-bold">Filters</Text>
            {activeCount > 0 && (
              <Pressable onPress={() => onChange({ setCode: null, color: null, cardType: null, altArtOnly: false })} className="active:opacity-60">
                <Text className="text-primary text-sm font-display-medium">Clear all</Text>
              </Pressable>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="mb-5">
              <MonoLabel className="mb-2.5">ART</MonoLabel>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label="Alt art only"
                  active={value.altArtOnly}
                  onPress={() => onChange({ ...value, altArtOnly: !value.altArtOnly })}
                />
              </View>
            </View>

            <FilterGroup
              label="SET"
              options={sets.map((s) => ({ key: s.code, label: s.code }))}
              selected={value.setCode}
              onSelect={(k) => onChange({ ...value, setCode: k })}
              mono
            />
            <FilterGroup
              label="COLOR"
              options={colors.map((c) => ({ key: c, label: c }))}
              selected={value.color}
              onSelect={(k) => onChange({ ...value, color: k })}
            />
            <FilterGroup
              label="CARD TYPE"
              options={cardTypes.map((t) => ({ key: t, label: t }))}
              selected={value.cardType}
              onSelect={(k) => onChange({ ...value, cardType: k })}
            />
          </ScrollView>

          <Pressable
            onPress={onClose}
            className="bg-primary rounded-2xl py-4 items-center active:opacity-90 mt-2"
          >
            <Text className="text-primary-ink font-display-bold text-base">Show results</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
