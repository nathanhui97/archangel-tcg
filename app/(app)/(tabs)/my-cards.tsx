import { useCallback } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMyBinders, useMyPublicCards } from '@/lib/binders'
import { useMyWantlist } from '@/lib/wantlist'
import { MonoLabel, PressRow } from '@/components/ui'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { CardTile } from '@/components/ui/CardTile'
import { BinderCoverTile, NewBinderTile } from '@/components/BinderCoverTile'
import { colors } from '@/lib/theme'

const GRID_GAP = 12

export default function MyCardsScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const tileW = (width - 40 - GRID_GAP) / 2 // 20px screen padding each side

  const { binders, loading: bindersLoading, refresh: refreshBinders } = useMyBinders()
  const { items: wantlistItems, loading: wantlistLoading, refresh: refreshWantlist } = useMyWantlist()
  const { cards: tradeCards, loading: tradeLoading, refresh: refreshTrade } = useMyPublicCards()

  useFocusEffect(
    useCallback(() => {
      refreshBinders()
      refreshWantlist()
      refreshTrade()
    }, [refreshBinders, refreshWantlist, refreshTrade])
  )

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader
        title="Binders"
        subtitle={`${binders.length} binder${binders.length !== 1 ? 's' : ''} · ${wantlistItems.length} on wantlist`}
      />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingTop: 4, paddingBottom: 28 }}>
        {/* For trade — the actual cards on the radar (from public binders) */}
        <View className="flex-row items-center justify-between mb-2.5">
          <MonoLabel>FOR TRADE</MonoLabel>
          {tradeCards.length > 0 && (
            <Link href="/(app)/trades" asChild>
              <Pressable className="active:opacity-60">
                <Text className="text-primary text-sm font-display-medium">See all →</Text>
              </Pressable>
            </Link>
          )}
        </View>
        {tradeLoading ? (
          <ActivityIndicator color={colors.primary} className="self-start mb-7" />
        ) : tradeCards.length === 0 ? (
          <View className="bg-surface border border-subtle rounded-2xl px-4 py-5 mb-7">
            <Text className="text-muted text-sm font-display">No cards on the radar yet</Text>
            <Text className="text-faint text-xs mt-1 font-display">Make a binder Public and add cards to start trading.</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
            className="mb-7"
          >
            {tradeCards.slice(0, 12).map((c) => (
              <CardTile
                key={c.id}
                width={84}
                uri={c.image_url}
                topLeft={
                  <View className="bg-bg/80 rounded px-1">
                    <Text className="text-muted-2 font-mono-bold text-[8px]">{c.condition}</Text>
                  </View>
                }
                onPress={() => router.push('/(app)/trades')}
              />
            ))}
            {tradeCards.length > 12 && (
              <Link href="/(app)/trades" asChild>
                <Pressable
                  style={{ width: 84, height: 84 / (5 / 7) }}
                  className="rounded-lg border border-dashed border-subtle items-center justify-center"
                >
                  <Text className="text-primary text-xs font-display-medium text-center">See all →</Text>
                </Pressable>
              </Link>
            )}
          </ScrollView>
        )}

        {/* Wantlist — pinned, distinct */}
        <MonoLabel className="mb-2.5">WANTLIST</MonoLabel>
        <Link href="/(app)/wantlist" asChild>
          <PressRow className="px-4 py-3.5 flex-row items-center mb-7">
            <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3">
              <Ionicons name="heart" size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-ink font-display-semibold">Wantlist</Text>
              <Text className="text-muted text-xs mt-0.5 font-display">
                {wantlistLoading ? 'Loading…' : `${wantlistItems.length} card${wantlistItems.length !== 1 ? 's' : ''} you're hunting`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.faint2} />
          </PressRow>
        </Link>

        {/* All binders — public = on the radar, private = just yours */}
        <View className="flex-row items-center justify-between mb-3">
          <MonoLabel>YOUR BINDERS</MonoLabel>
          <View className="flex-row items-center gap-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-primary" />
            <Text className="text-faint-2 text-[11px] font-display">Public = on the radar</Text>
          </View>
        </View>
        {bindersLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
            {binders.map((b) => (
              <BinderCoverTile
                key={b.id}
                width={tileW}
                name={b.name}
                itemCount={b.item_count}
                isPublic={b.is_public}
                coverUrls={b.cover_urls}
                onPress={() => router.push(`/(app)/binders/${b.id}`)}
              />
            ))}
            <NewBinderTile width={tileW} label="New binder" onPress={() => router.push('/(app)/binders/new')} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
