import { useState } from 'react'
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useRouter, Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMyBinders, deleteBinder } from '@/lib/binders'
import { PressRow, StatusDot } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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
  const insets = useSafeAreaInsets()
  const { binders, loading, error, refresh } = useMyBinders()
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)

  async function doDelete() {
    if (!deleting) return
    const { id } = deleting
    setDeleting(null)
    try {
      await deleteBinder(id)
      refresh()
    } catch (err) {
      Alert.alert('Error', (err as Error).message)
    }
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 24 }}
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
          ListFooterComponent={
            binders.length > 0 ? (
              <View className="flex-row items-center justify-center gap-1.5 mt-6">
                <Ionicons name="information-circle-outline" size={13} color={colors.faint} />
                <Text className="text-faint text-xs font-display">Long-press a binder to delete</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <PressRow
              onPress={() => router.push(`/(app)/binders/${item.id}`)}
              onLongPress={() => setDeleting({ id: item.id, name: item.name })}
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

      <ConfirmDialog
        visible={!!deleting}
        title={`Delete ${deleting?.name ?? 'this binder'}?`}
        message="This removes the binder and every card inside it. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={doDelete}
        onCancel={() => setDeleting(null)}
      />
    </View>
  )
}
