import { useCallback } from 'react'
import { View, Text, FlatList, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native'
import { Stack, useFocusEffect } from 'expo-router'
import { useMyPublicCards } from '@/lib/binders'
import { CardTile, gridTileWidth } from '@/components/ui/CardTile'
import { colors } from '@/lib/theme'

export default function TradesScreen() {
  const { width } = useWindowDimensions()
  const tileW = gridTileWidth(width)
  const { cards, loading, refresh } = useMyPublicCards()

  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: 'For trade' }} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          numColumns={3}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 14, paddingTop: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <CardTile
              width={tileW}
              uri={item.image_url}
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
              subtitle={item.name}
            />
          )}
          ListEmptyComponent={
            <View className="items-center pt-20 px-8">
              <Text className="text-ink font-display-semibold text-base">Nothing on the radar yet</Text>
              <Text className="text-muted text-sm mt-2 text-center font-display">
                Cards in your <Text className="text-primary">Public</Text> binders show up here for nearby traders. Make a binder public or add cards to one.
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}
