import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native'
import { Stack, useRouter, Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMyBinders, deleteBinder } from '@/lib/binders'
import { PressRow, StatusDot } from '@/components/ui'
import { colors } from '@/lib/theme'

function NewPill() {
  return (
    <Link href="/(app)/binders/new" asChild>
      <Pressable className="flex-row items-center gap-1 bg-primary/10 border border-primary rounded-lg px-3 py-1.5 active:opacity-70">
        <Ionicons name="add" size={15} color={colors.primary} />
        <Text className="text-primary font-display-semibold text-sm">New</Text>
      </Pressable>
    </Link>
  )
}

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
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: 'My Binders', headerRight: () => <NewPill /> }} />

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
          data={binders}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 20 }}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          ListEmptyComponent={
            <View className="items-center py-16 px-6">
              <Text className="text-ink font-display-semibold text-lg">No binders yet</Text>
              <Text className="text-muted text-sm mt-2 text-center font-display">
                Create your first binder to start tracking cards you own and want to trade.
              </Text>
              <Link href="/(app)/binders/new" asChild>
                <Pressable
                  className="mt-6 bg-primary px-6 py-3 rounded-2xl active:opacity-90"
                  style={{ shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } }}
                >
                  <Text className="text-primary-ink font-display-bold">Create a binder</Text>
                </Pressable>
              </Link>
            </View>
          }
          renderItem={({ item }) => (
            <PressRow
              onPress={() => router.push(`/(app)/binders/${item.id}`)}
              onLongPress={() => confirmDelete(item.id, item.name)}
              className="p-4"
            >
              <View className="flex-row items-center justify-between">
                <Text numberOfLines={1} className="text-ink font-display-semibold text-base flex-1 pr-3">
                  {item.name}
                </Text>
                <StatusDot on={item.is_public} label={item.is_public ? 'Public' : 'Private'} />
              </View>
              <Text className="text-muted text-xs mt-1.5 font-display">
                {item.item_count} {item.item_count === 1 ? 'card' : 'cards'}
              </Text>
            </PressRow>
          )}
        />
      )}
    </View>
  )
}
