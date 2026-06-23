import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native'
import { Stack, useRouter, Link } from 'expo-router'
import { useMyBinders, deleteBinder } from '@/lib/binders'

export default function BindersListScreen() {
  const router = useRouter()
  const { binders, loading, error, refresh } = useMyBinders()

  function confirmDelete(id: string, name: string) {
    Alert.alert(
      `Delete ${name}?`,
      'This removes the binder and every card inside it. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBinder(id)
              refresh()
            } catch (err) {
              Alert.alert('Error', (err as Error).message)
            }
          },
        },
      ]
    )
  }

  return (
    <View className="flex-1 bg-gray-950">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'My Binders',
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#ffffff',
          headerRight: () => (
            <Link href="/(app)/binders/new" asChild>
              <Pressable className="px-3 py-1.5 active:opacity-60">
                <Text className="text-indigo-400 font-semibold">+ New</Text>
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
          data={binders}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            <View className="items-center py-16 px-6">
              <Text className="text-white font-semibold text-lg">No binders yet</Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Create your first binder to start tracking cards you own and want to trade.
              </Text>
              <Link href="/(app)/binders/new" asChild>
                <Pressable className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl active:opacity-80">
                  <Text className="text-white font-semibold">Create a binder</Text>
                </Pressable>
              </Link>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(app)/binders/${item.id}`)}
              onLongPress={() => confirmDelete(item.id, item.name)}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 active:opacity-70"
            >
              <View className="flex-row items-center justify-between">
                <Text numberOfLines={1} className="text-white font-semibold text-base flex-1">
                  {item.name}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded ${
                    item.is_public ? 'bg-emerald-900/40' : 'bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      item.is_public ? 'text-emerald-300' : 'text-gray-500'
                    }`}
                  >
                    {item.is_public ? 'Public' : 'Private'}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-500 text-xs mt-1.5">
                {item.item_count} {item.item_count === 1 ? 'card' : 'cards'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}
