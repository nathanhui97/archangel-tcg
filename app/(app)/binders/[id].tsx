import { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useBinder, addCardsToBinder, removeBinderItem, updateBinder } from '@/lib/binders'
import { CardPicker } from '@/components/CardPicker'
import { useAuth } from '@/lib/auth'
import { MonoLabel } from '@/components/ui'
import { CardTile, gridTileWidth } from '@/components/ui/CardTile'
import { colors } from '@/lib/theme'

/** Group key for a binder item: the card's set name, falling back to the set code in its id (e.g. "GD01"). */
function setLabel(item: { card?: { set_name?: string | null } | null; card_id: string }): string {
  return item.card?.set_name || item.card_id.split('-')[0] || 'Other'
}

function HeaderButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1 bg-primary/10 border border-primary rounded-lg px-3 py-1.5 active:opacity-70"
    >
      {icon && <Ionicons name="add" size={15} color={colors.primary} />}
      <Text className="text-primary font-display-semibold text-sm">{label}</Text>
    </Pressable>
  )
}

export default function BinderDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const { binder, items, loading, error, refresh } = useBinder(id)
  const [adding, setAdding] = useState(false)

  const isOwner = !!binder && !!session && binder.user_id === session.user.id

  const { width } = useWindowDimensions()
  const tileW = gridTileWidth(width)

  // Group cards by set so they're easy to find, sorted by set name.
  const sections = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const it of items) {
      const key = setLabel(it)
      const arr = map.get(key)
      if (arr) arr.push(it)
      else map.set(key, [it])
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([title, data]) => ({ title, data }))
  }, [items])

  function confirmRemove(itemId: string, name: string) {
    Alert.alert(`Remove ${name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeBinderItem(itemId)
            refresh()
          } catch (err) {
            Alert.alert('Error', (err as Error).message)
          }
        },
      },
    ])
  }

  async function setPublic(value: boolean) {
    if (!binder || binder.is_public === value) return
    try {
      await updateBinder(binder.id, { is_public: value })
      refresh()
    } catch (err) {
      Alert.alert('Error', (err as Error).message)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (error || !binder) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-danger text-sm font-display">{error ?? 'Binder not found.'}</Text>
        <Pressable onPress={() => router.back()} className="mt-4 active:opacity-60">
          <Text className="text-primary font-display-medium">← Back</Text>
        </Pressable>
      </View>
    )
  }

  // "Add cards" mode — full-catalog multi-select picker
  if (adding) {
    return (
      <View className="flex-1 bg-bg">
        <Stack.Screen
          options={{
            headerShown: true,
            title: '',
            headerRight: () => <HeaderButton label="Done" onPress={() => setAdding(false)} />,
          }}
        />
        <CardPicker
          title={`Add to ${binder.name}`}
          addNoun="binder"
          onAdd={async (cardIds) => {
            await addCardsToBinder(binder.id, cardIds)
            refresh()
          }}
        />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerRight: isOwner ? () => <HeaderButton label="Add" icon onPress={() => setAdding(true)} /> : undefined,
        }}
      />

      <View className="px-5 pt-1 pb-3">
        <Text className="text-ink text-[22px] font-display-bold" numberOfLines={1}>{binder.name}</Text>
        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-muted text-sm font-display">
            {items.length} card{items.length !== 1 ? 's' : ''}
          </Text>

          {isOwner ? (
            <View className="flex-row bg-surface border border-subtle rounded-xl p-0.5">
              {([true, false] as const).map((pub) => {
                const active = binder.is_public === pub
                return (
                  <Pressable
                    key={String(pub)}
                    onPress={() => setPublic(pub)}
                    className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-[10px] ${active ? 'bg-primary/10' : ''}`}
                  >
                    {pub && active && <View className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    <Text className={`text-xs font-display-medium ${active ? 'text-primary' : 'text-muted-2'}`}>
                      {pub ? 'Public' : 'Private'}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : (
            <Text className={`text-xs font-display-medium ${binder.is_public ? 'text-primary' : 'text-faint-2'}`}>
              {binder.is_public ? 'Public' : 'Private'}
            </Text>
          )}
        </View>
      </View>

      {items.length === 0 ? (
        <View className="items-center py-16 px-6">
          <Text className="text-ink font-display-semibold text-lg">No cards yet</Text>
          <Text className="text-muted text-sm mt-2 text-center font-display">
            {isOwner ? 'Tap "Add" to search and add your first card.' : 'This binder is empty.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          {sections.map((section) => (
            <View key={section.title} className="mb-5">
              <View className="flex-row items-center justify-between mb-2.5">
                <MonoLabel>{section.title}</MonoLabel>
                <Text className="text-faint-2 text-[11px] font-mono">{section.data.length}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {section.data.map((item) => (
                  <CardTile
                    key={item.id}
                    width={tileW}
                    uri={item.card?.image_url}
                    onLongPress={isOwner ? () => confirmRemove(item.id, item.card?.name ?? 'this card') : undefined}
                    topLeft={
                      <View className="bg-bg/80 rounded px-1 py-0.5">
                        <Text className="text-muted-2 font-mono-bold text-[9px]">{item.condition}{item.is_foil ? ' ✦' : ''}</Text>
                      </View>
                    }
                    topRight={
                      item.quantity > 1 ? (
                        <View className="bg-bg/80 rounded px-1">
                          <Text className="text-ink font-mono-bold text-[10px]">×{item.quantity}</Text>
                        </View>
                      ) : undefined
                    }
                    title={item.card_id}
                    subtitle={item.card?.name}
                  />
                ))}
              </View>
            </View>
          ))}

          {isOwner && (
            <View className="flex-row items-center justify-center gap-1.5 pt-1">
              <Ionicons name="information-circle-outline" size={13} color={colors.faint} />
              <Text className="text-faint text-xs font-display">Long-press a card to remove</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}
