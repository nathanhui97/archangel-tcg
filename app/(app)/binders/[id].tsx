import { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useBinder, addCardToBinder, removeBinderItem, updateBinder } from '@/lib/binders'
import { CardSearch } from '@/components/CardSearch'
import { AddToBinderSheet } from '@/components/AddToBinderSheet'
import { useAuth } from '@/lib/auth'
import type { Card } from '@/types'

export default function BinderDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const { binder, items, loading, error, refresh } = useBinder(id)
  const [adding, setAdding] = useState(false)
  const [pendingCard, setPendingCard] = useState<Card | null>(null)

  const isOwner = !!binder && !!session && binder.user_id === session.user.id

  async function handleConfirmAdd(input: { quantity: number; condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'; isFoil: boolean }) {
    if (!pendingCard || !binder) return
    await addCardToBinder({
      binderId: binder.id,
      cardId: pendingCard.id,
      quantity: input.quantity,
      condition: input.condition,
      isFoil: input.isFoil,
    })
    setPendingCard(null)
    refresh()
  }

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

  async function togglePublic(value: boolean) {
    if (!binder) return
    try {
      await updateBinder(binder.id, { is_public: value })
      refresh()
    } catch (err) {
      Alert.alert('Error', (err as Error).message)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator color="#6366f1" />
      </View>
    )
  }

  if (error || !binder) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center px-6">
        <Text className="text-red-400 text-sm">{error ?? 'Binder not found.'}</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 active:opacity-60"
        >
          <Text className="text-indigo-400">← Back</Text>
        </Pressable>
      </View>
    )
  }

  // "Add cards" mode: show the search component instead of the binder
  if (adding) {
    return (
      <View className="flex-1 bg-gray-950">
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Add to ' + binder.name,
            headerStyle: { backgroundColor: '#0f172a' },
            headerTintColor: '#ffffff',
            headerRight: () => (
              <Pressable
                onPress={() => setAdding(false)}
                className="px-3 py-1.5 active:opacity-60"
              >
                <Text className="text-indigo-400 font-semibold">Done</Text>
              </Pressable>
            ),
          }}
        />
        <View className="pt-3 flex-1">
          <CardSearch onSelect={(card) => setPendingCard(card)} />
        </View>
        <AddToBinderSheet
          card={pendingCard}
          onCancel={() => setPendingCard(null)}
          onConfirm={handleConfirmAdd}
        />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-950">
      <Stack.Screen
        options={{
          headerShown: true,
          title: binder.name,
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#ffffff',
          headerRight: isOwner
            ? () => (
                <Pressable
                  onPress={() => setAdding(true)}
                  className="px-3 py-1.5 active:opacity-60"
                >
                  <Text className="text-indigo-400 font-semibold">+ Add</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      {isOwner && (
        <View className="mx-4 mt-4 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-white font-medium">Public</Text>
            <Text className="text-gray-500 text-xs mt-0.5">
              {binder.is_public
                ? 'Others can see this binder and match against your cards.'
                : 'Only you can see this binder.'}
            </Text>
          </View>
          <Switch
            value={binder.is_public}
            onValueChange={togglePublic}
            trackColor={{ false: '#1e293b', true: '#4f46e5' }}
            thumbColor="#ffffff"
          />
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, paddingTop: 12 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <View className="items-center py-16 px-6">
            <Text className="text-white font-semibold text-lg">No cards yet</Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">
              {isOwner
                ? 'Tap "+ Add" to search and add your first card.'
                : 'This binder is empty.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const card = item.card
          return (
            <Pressable
              onLongPress={isOwner ? () => confirmRemove(item.id, card?.name ?? 'this card') : undefined}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex-row items-center"
            >
              {card?.image_url ? (
                <Image
                  source={{ uri: card.image_url }}
                  className="w-12 h-16 rounded-md bg-gray-800"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-12 h-16 rounded-md bg-gray-800" />
              )}
              <View className="flex-1 ml-3">
                <Text numberOfLines={1} className="text-white font-semibold text-base">
                  {card?.name ?? 'Unknown card'}
                </Text>
                <Text className="text-gray-500 text-xs font-mono mt-0.5">{item.card_id}</Text>
                <View className="flex-row mt-1.5 gap-1.5">
                  <Tag>{`×${item.quantity}`}</Tag>
                  <Tag>{item.condition}</Tag>
                  {item.is_foil && <Tag>Foil</Tag>}
                </View>
              </View>
            </Pressable>
          )
        }}
      />

      {isOwner && items.length > 0 && (
        <Text className="text-gray-600 text-xs text-center pb-6">
          Long-press a card to remove
        </Text>
      )}
    </View>
  )
}

function Tag({ children }: { children: string }) {
  return (
    <View className="bg-gray-800 px-2 py-0.5 rounded">
      <Text className="text-gray-300 text-[10px] font-medium uppercase tracking-wider">
        {children}
      </Text>
    </View>
  )
}
