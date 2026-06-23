import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { Stack } from 'expo-router'
import { CardSearch } from '@/components/CardSearch'
import { addToWantlist, useMyWantlist } from '@/lib/wantlist'
import type { Card } from '@/types'

export default function AddToWantlistScreen() {
  const { cardIds, refresh } = useMyWantlist()
  const [toast, setToast] = useState<{ kind: 'added' | 'already'; name: string } | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

  // Auto-dismiss the toast after 1.5s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1500)
    return () => clearTimeout(t)
  }, [toast])

  async function handleSelect(card: Card) {
    if (busyIds.has(card.id)) return
    if (cardIds.has(card.id)) {
      setToast({ kind: 'already', name: card.name })
      return
    }
    setBusyIds((prev) => new Set(prev).add(card.id))
    try {
      await addToWantlist(card.id)
      setToast({ kind: 'added', name: card.name })
      await refresh()
    } catch (err) {
      setToast({ kind: 'already', name: (err as Error).message })
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(card.id)
        return next
      })
    }
  }

  return (
    <View className="flex-1 bg-gray-950">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Add to Wantlist',
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#ffffff',
        }}
      />

      <View className="pt-3 flex-1">
        <CardSearch
          onSelect={handleSelect}
          placeholder="Search the card you want"
        />
      </View>

      {toast && (
        <View
          pointerEvents="none"
          className="absolute bottom-10 left-6 right-6 items-center"
        >
          <View
            className={`px-5 py-3 rounded-2xl ${
              toast.kind === 'added' ? 'bg-emerald-600' : 'bg-gray-800 border border-gray-700'
            }`}
          >
            <Text className="text-white font-semibold text-sm">
              {toast.kind === 'added' ? `✓ Added ${toast.name}` : `${toast.name} is already on your wantlist`}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
