import { View, Text, Modal, Pressable, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Chip, MonoLabel } from '@/components/ui'

export type TradeFilters = {
  radiusKm: number
  art: 'alt' | 'base' | null // alt-art / base print / either
  color: string | null
  cardType: string | null
}

export const DEFAULT_RADIUS = 25
export const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const

export const emptyTradeFilters: TradeFilters = {
  radiusKm: DEFAULT_RADIUS,
  art: null,
  color: null,
  cardType: null,
}

/** Non-default filters active (radius counts when it isn't the default). */
export function activeTradeFilterCount(f: TradeFilters): number {
  return [f.art, f.color, f.cardType].filter(Boolean).length + (f.radiusKm !== DEFAULT_RADIUS ? 1 : 0)
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

type Props = {
  visible: boolean
  onClose: () => void
  colorOptions: string[]
  cardTypes: string[]
  value: TradeFilters
  onChange: (next: TradeFilters) => void
}

/** Bottom sheet for the Trade tab: distance + art / color / type. */
export function TradeFilterSheet({ visible, onClose, colorOptions, cardTypes, value, onChange }: Props) {
  const insets = useSafeAreaInsets()
  const activeCount = activeTradeFilterCount(value)

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
              <Pressable onPress={() => onChange(emptyTradeFilters)} className="active:opacity-60">
                <Text className="text-primary text-sm font-display-medium">Clear all</Text>
              </Pressable>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Distance — always set, so no "All" option */}
            <View className="mb-5">
              <MonoLabel className="mb-2.5">DISTANCE</MonoLabel>
              <View className="flex-row flex-wrap gap-2">
                {RADIUS_OPTIONS.map((r) => (
                  <Chip
                    key={r}
                    label={`${r} km`}
                    active={value.radiusKm === r}
                    onPress={() => onChange({ ...value, radiusKm: r })}
                    mono
                  />
                ))}
              </View>
            </View>

            <FilterGroup
              label="ART"
              options={[
                { key: 'alt', label: 'Alt art' },
                { key: 'base', label: 'Base art' },
              ]}
              selected={value.art}
              onSelect={(k) => onChange({ ...value, art: k as 'alt' | 'base' | null })}
            />
            <FilterGroup
              label="COLOR"
              options={colorOptions.map((c) => ({ key: c, label: c }))}
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

          <Pressable onPress={onClose} className="bg-primary rounded-2xl py-4 items-center active:opacity-90 mt-2">
            <Text className="text-primary-ink font-display-bold text-base">Show results</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
