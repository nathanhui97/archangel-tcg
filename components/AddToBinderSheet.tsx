import { useState } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native'
import type { Card, Condition } from '@/types'

const CONDITIONS: { value: Condition; label: string; subtitle: string }[] = [
  { value: 'NM',  label: 'NM',  subtitle: 'Near Mint' },
  { value: 'LP',  label: 'LP',  subtitle: 'Lightly Played' },
  { value: 'MP',  label: 'MP',  subtitle: 'Moderately Played' },
  { value: 'HP',  label: 'HP',  subtitle: 'Heavily Played' },
  { value: 'DMG', label: 'DMG', subtitle: 'Damaged' },
]

type Props = {
  card: Card | null
  onCancel: () => void
  onConfirm: (input: { quantity: number; condition: Condition; isFoil: boolean }) => Promise<void>
}

export function AddToBinderSheet({ card, onCancel, onConfirm }: Props) {
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
      // Reset for next add
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
    <Modal
      visible={!!card}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable onPress={onCancel} className="flex-1 bg-black/60 justify-end">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-gray-950 rounded-t-3xl border-t border-gray-800 p-6 pb-10"
        >
          {card && (
            <>
              <View className="flex-row items-center mb-5">
                {card.image_url ? (
                  <Image
                    source={{ uri: card.image_url }}
                    className="w-16 h-22 rounded-lg bg-gray-900"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-16 h-22 rounded-lg bg-gray-900" />
                )}
                <View className="flex-1 ml-3">
                  <Text className="text-white font-bold text-base" numberOfLines={2}>
                    {card.name}
                  </Text>
                  <Text className="text-gray-500 text-xs font-mono mt-1">{card.id}</Text>
                  {card.set_name && (
                    <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>
                      {card.set_name}
                    </Text>
                  )}
                </View>
              </View>

              {/* Quantity stepper */}
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-gray-300 font-medium">Quantity</Text>
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    className="bg-gray-800 w-10 h-10 rounded-xl items-center justify-center active:opacity-60"
                  >
                    <Text className="text-white text-xl font-bold">−</Text>
                  </Pressable>
                  <Text className="text-white text-xl font-bold w-12 text-center">
                    {quantity}
                  </Text>
                  <Pressable
                    onPress={() => setQuantity(Math.min(999, quantity + 1))}
                    className="bg-gray-800 w-10 h-10 rounded-xl items-center justify-center active:opacity-60"
                  >
                    <Text className="text-white text-xl font-bold">+</Text>
                  </Pressable>
                </View>
              </View>

              {/* Condition picker */}
              <Text className="text-gray-300 font-medium mb-2">Condition</Text>
              <View className="flex-row gap-1.5 mb-5">
                {CONDITIONS.map((c) => {
                  const selected = condition === c.value
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => setCondition(c.value)}
                      className={`flex-1 py-2.5 rounded-lg border items-center active:opacity-80 ${
                        selected
                          ? 'bg-indigo-600 border-indigo-500'
                          : 'bg-gray-900 border-gray-800'
                      }`}
                    >
                      <Text
                        className={`font-bold text-sm ${
                          selected ? 'text-white' : 'text-gray-400'
                        }`}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              {/* Foil toggle */}
              <View className="flex-row items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 mb-5">
                <View className="flex-1 pr-3">
                  <Text className="text-white font-medium">Foil / Parallel</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    Mark if this is a foil or alternate-art print of the card.
                  </Text>
                </View>
                <Switch
                  value={isFoil}
                  onValueChange={setIsFoil}
                  trackColor={{ false: '#1e293b', true: '#4f46e5' }}
                  thumbColor="#ffffff"
                />
              </View>

              {error && (
                <Text className="text-red-400 text-sm text-center mb-3">{error}</Text>
              )}

              <View className="flex-row gap-2">
                <Pressable
                  onPress={onCancel}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-xl bg-gray-800 items-center active:opacity-70"
                >
                  <Text className="text-gray-300 font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  disabled={saving}
                  className="flex-[2] py-3.5 rounded-xl bg-indigo-600 items-center active:opacity-80"
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-white font-semibold">Add to binder</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
