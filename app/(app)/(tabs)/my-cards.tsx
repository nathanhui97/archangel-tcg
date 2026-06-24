import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMyBinders } from '@/lib/binders'
import { useMyWantlist } from '@/lib/wantlist'

export default function MyCardsScreen() {
  const { binders, loading: bindersLoading } = useMyBinders()
  const { items: wantlistItems, loading: wantlistLoading } = useMyWantlist()

  const tradeBinders = binders.filter(b => b.binder_type === 'trade')
  const collectionBinders = binders.filter(b => b.binder_type === 'collection')

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <ScrollView className="flex-1 px-4 pt-4">

        {/* Trade binders */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-bold text-base">For Trade</Text>
            <Link href="/(app)/binders/new?type=trade" asChild>
              <Pressable className="flex-row items-center gap-1 active:opacity-60">
                <Ionicons name="add" size={16} color="#6366f1" />
                <Text className="text-indigo-400 text-sm">New</Text>
              </Pressable>
            </Link>
          </View>

          {bindersLoading ? (
            <ActivityIndicator color="#6366f1" />
          ) : tradeBinders.length === 0 ? (
            <Link href="/(app)/binders/new?type=trade" asChild>
              <Pressable className="border border-dashed border-gray-700 rounded-2xl px-4 py-5 items-center active:opacity-60">
                <Ionicons name="swap-horizontal-outline" size={24} color="#6b7280" />
                <Text className="text-gray-500 text-sm mt-2">Create a trade binder</Text>
                <Text className="text-gray-600 text-xs mt-1 text-center">
                  Cards here show up in Browse for nearby traders
                </Text>
              </Pressable>
            </Link>
          ) : (
            <View className="gap-2">
              {tradeBinders.map(b => (
                <Link key={b.id} href={`/(app)/binders/${b.id}`} asChild>
                  <Pressable className="bg-gray-900 border border-indigo-900/50 rounded-2xl px-4 py-3 flex-row items-center justify-between active:opacity-70">
                    <View>
                      <Text className="text-white font-medium">{b.name}</Text>
                      <Text className="text-gray-500 text-xs mt-0.5">
                        {b.item_count} card{b.item_count !== 1 ? 's' : ''}
                        {' · '}
                        <Text className={b.is_public ? 'text-green-500' : 'text-gray-600'}>
                          {b.is_public ? 'Public' : 'Hidden'}
                        </Text>
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                  </Pressable>
                </Link>
              ))}
            </View>
          )}
        </View>

        {/* Wantlist */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-bold text-base">Wantlist</Text>
            <Link href="/(app)/wantlist/add" asChild>
              <Pressable className="flex-row items-center gap-1 active:opacity-60">
                <Ionicons name="add" size={16} color="#6366f1" />
                <Text className="text-indigo-400 text-sm">Add</Text>
              </Pressable>
            </Link>
          </View>

          {wantlistLoading ? (
            <ActivityIndicator color="#6366f1" />
          ) : (
            <Link href="/(app)/wantlist" asChild>
              <Pressable className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex-row items-center justify-between active:opacity-70">
                <View>
                  <Text className="text-white font-medium">My Wantlist</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    {wantlistItems.length} card{wantlistItems.length !== 1 ? 's' : ''} · Powers matching
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#6b7280" />
              </Pressable>
            </Link>
          )}
        </View>

        {/* Collection binders */}
        {(collectionBinders.length > 0 || !bindersLoading) && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-bold text-base">Collections</Text>
              <Link href="/(app)/binders/new?type=collection" asChild>
                <Pressable className="flex-row items-center gap-1 active:opacity-60">
                  <Ionicons name="add" size={16} color="#6366f1" />
                  <Text className="text-indigo-400 text-sm">New</Text>
                </Pressable>
              </Link>
            </View>

            {bindersLoading ? (
              <ActivityIndicator color="#6366f1" />
            ) : collectionBinders.length === 0 ? (
              <Link href="/(app)/binders/new?type=collection" asChild>
                <Pressable className="border border-dashed border-gray-700 rounded-2xl px-4 py-5 items-center active:opacity-60">
                  <Ionicons name="albums-outline" size={24} color="#6b7280" />
                  <Text className="text-gray-500 text-sm mt-2">Create a collection</Text>
                </Pressable>
              </Link>
            ) : (
              <View className="gap-2">
                {collectionBinders.map(b => (
                  <Link key={b.id} href={`/(app)/binders/${b.id}`} asChild>
                    <Pressable className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex-row items-center justify-between active:opacity-70">
                      <View>
                        <Text className="text-white font-medium">{b.name}</Text>
                        <Text className="text-gray-500 text-xs mt-0.5">
                          {b.item_count} card{b.item_count !== 1 ? 's' : ''}
                          {' · '}
                          <Text className={b.is_public ? 'text-green-500' : 'text-gray-600'}>
                            {b.is_public ? 'Public' : 'Private'}
                          </Text>
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                    </Pressable>
                  </Link>
                ))}
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
