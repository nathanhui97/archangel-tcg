import { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Stack, Link, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMyWantlist, removeFromWantlist } from '@/lib/wantlist'
import { CardThumb } from '@/components/ui'
import { colors } from '@/lib/theme'

function AddPill() {
  return (
    <Link href="/(app)/wantlist/add" asChild>
      <Pressable className="flex-row items-center gap-1 bg-primary/10 border border-primary rounded-lg px-3 py-1.5 active:opacity-70">
        <Ionicons name="add" size={15} color={colors.primary} />
        <Text className="text-primary font-display-semibold text-sm">Add</Text>
      </Pressable>
    </Link>
  )
}

export default function WantlistScreen() {
  const { items, loading, error, refresh } = useMyWantlist()

  // Refetch when this screen regains focus (e.g. after adding cards on the picker).
  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  function confirmRemove(itemId: string, name: string) {
    Alert.alert(`Remove ${name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFromWantlist(itemId)
            refresh()
          } catch (err) {
            Alert.alert('Error', (err as Error).message)
          }
        },
      },
    ])
  }

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: 'Wantlist', headerRight: () => <AddPill /> }} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-danger text-sm font-display">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
          ItemSeparatorComponent={() => <View className="h-px bg-hair my-2.5" />}
          ListEmptyComponent={
            <View className="items-center py-16 px-6">
              <Text className="text-ink font-display-semibold text-lg">Wantlist is empty</Text>
              <Text className="text-muted text-sm mt-2 text-center font-display">
                Add cards you&apos;re hunting for. Players nearby with those cards in their public binders show up as matches.
              </Text>
              <Link href="/(app)/wantlist/add" asChild>
                <Pressable
                  className="mt-6 bg-primary px-6 py-3 rounded-2xl active:opacity-90"
                  style={{ shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } }}
                >
                  <Text className="text-primary-ink font-display-bold">Add cards</Text>
                </Pressable>
              </Link>
            </View>
          }
          ListFooterComponent={
            items.length > 0 ? (
              <View className="flex-row items-center justify-center gap-1.5 mt-6">
                <Ionicons name="information-circle-outline" size={13} color={colors.faint} />
                <Text className="text-faint text-xs font-display">Long-press a card to remove</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const card = item.card
            return (
              <Pressable
                onLongPress={() => confirmRemove(item.id, card?.name ?? 'this card')}
                className="flex-row items-center active:opacity-70"
              >
                <CardThumb uri={card?.image_url} className="w-12 h-[67px]" radius="rounded-lg" />
                <View className="flex-1 ml-3">
                  <Text className="text-ink font-mono-bold text-[15px]">{item.card_id}</Text>
                  {card?.set_name && (
                    <Text numberOfLines={1} className="text-muted text-xs mt-1 font-display">{card.set_name}</Text>
                  )}
                </View>
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
}
