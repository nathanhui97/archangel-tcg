import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Stack, Link } from 'expo-router'
import { useMyWantlist, removeFromWantlist } from '@/lib/wantlist'

export default function WantlistScreen() {
  const { items, loading, error, refresh } = useMyWantlist()

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
    <View className="flex-1 bg-gray-950">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'My Wantlist',
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#ffffff',
          headerRight: () => (
            <Link href="/(app)/wantlist/add" asChild>
              <Pressable className="px-3 py-1.5 active:opacity-60">
                <Text className="text-indigo-400 font-semibold">+ Add</Text>
              </Pressable>
            </Link>
          ),
        }}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            <View className="items-center py-16 px-6">
              <Text className="text-white font-semibold text-lg">Wantlist is empty</Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Add cards you&apos;re hunting for. Players nearby with those cards in their
                public binders will show up as matches.
              </Text>
              <Link href="/(app)/wantlist/add" asChild>
                <Pressable className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl active:opacity-80">
                  <Text className="text-white font-semibold">Add cards</Text>
                </Pressable>
              </Link>
            </View>
          }
          ListHeaderComponent={
            items.length > 0 ? (
              <Text className="text-gray-500 text-xs mb-3">
                {items.length} card{items.length === 1 ? '' : 's'} on your wantlist
              </Text>
            ) : null
          }
          ListFooterComponent={
            items.length > 0 ? (
              <Text className="text-gray-600 text-xs text-center mt-6">
                Long-press a card to remove
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const card = item.card
            return (
              <Pressable
                onLongPress={() => confirmRemove(item.id, card?.name ?? 'this card')}
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
                  {card?.set_name && (
                    <Text numberOfLines={1} className="text-gray-500 text-xs mt-0.5">
                      {card.set_name}
                    </Text>
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
