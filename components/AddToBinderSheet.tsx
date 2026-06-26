import { useState } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  Switch,
} from 'react-native'
import type { Card, Condition } from '@/types'
import { Button, MonoLabel, CardThumb } from '@/components/ui'
import { colors } from '@/lib/theme'

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'NM', label: 'NM' },
  { value: 'LP', label: 'LP' },
  { value: 'MP', label: 'MP' },
  { value: 'HP', label: 'HP' },
  { value: 'DMG', label: 'DMG' },
]

type Props = {
  card: Card | null
  binderName?: string
  onCancel: () => void
  onConfirm: (input: { quantity: number; condition: Condition; isFoil: boolean }) => Promise<void>
}

export function AddToBinderSheet({ card, binderName, onCancel, onConfirm }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState<Condition>('NM')
  const [isFoil, setIsFoil] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!card) return
    setSaving(true)
    setError(null)
    try {
      await onConfirm({ quantity, condition, isFoil })
      setQuantity(1)
      setCondition('NM')
      setIsFoil(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={!!card} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(2,4,3,0.55)' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-sheet rounded-t-[26px] border-t border-primary-soft px-6 pt-3 pb-10"
        >
          {/* grab handle */}
          <View className="self-center w-9 h-1 rounded-full bg-track mb-5" />

          {card && (
            <>
              <View className="flex-row items-center mb-6">
                <CardThumb uri={card.image_url} className="w-[54px] h-[74px]" radius="rounded-lg" />
                <View className="flex-1 ml-3">
                  <Text className="text-ink font-mono-bold text-[17px]" numberOfLines={1}>{card.id}</Text>
                  {binderName && (
                    <Text className="text-muted text-xs mt-1 font-display" numberOfLines={1}>→ {binderName}</Text>
                  )}
                </View>
              </View>

              {/* Quantity */}
              <MonoLabel className="mb-2">QUANTITY</MonoLabel>
              <View className="flex-row items-center gap-4 mb-6">
                <Pressable
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-[42px] h-[42px] rounded-xl bg-surface-control border border-subtle items-center justify-center active:opacity-60"
                >
                  <Text className="text-ink text-xl font-mono-medium">−</Text>
                </Pressable>
                <Text className="text-ink text-[22px] font-mono-bold w-10 text-center">{quantity}</Text>
                <Pressable
                  onPress={() => setQuantity(Math.min(999, quantity + 1))}
                  className="w-[42px] h-[42px] rounded-xl bg-surface-control border border-subtle items-center justify-center active:opacity-60"
                >
                  <Text className="text-primary text-xl font-mono-medium">+</Text>
                </Pressable>
              </View>

              {/* Condition */}
              <MonoLabel className="mb-2">CONDITION</MonoLabel>
              <View className="flex-row gap-1.5 mb-6">
                {CONDITIONS.map((c) => {
                  const selected = condition === c.value
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => setCondition(c.value)}
                      className={`flex-1 py-2.5 rounded-lg border items-center active:opacity-80 ${
                        selected ? 'bg-primary/10 border-primary' : 'bg-surface border-subtle'
                      }`}
                    >
                      <Text className={`font-mono-bold text-sm ${selected ? 'text-primary' : 'text-muted-2'}`}>
                        {c.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              {/* Foil */}
              <View className="flex-row items-center justify-between bg-surface border border-subtle rounded-xl px-4 py-3 mb-6">
                <View className="flex-row items-center gap-2">
                  <Text className="text-gold text-base">✦</Text>
                  <Text className="text-ink font-display-medium">Foil</Text>
                </View>
                <Switch
                  value={isFoil}
                  onValueChange={setIsFoil}
                  trackColor={{ false: colors.track, true: colors.primary }}
                  thumbColor={isFoil ? colors.primaryInk : colors.muted2}
                  ios_backgroundColor={colors.track}
                />
              </View>

              {error && <Text className="text-danger text-sm text-center mb-3 font-display">{error}</Text>}

              <Button title="Add to binder" onPress={handleConfirm} loading={saving} />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
