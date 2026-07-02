import { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useFeed, addReaction, removeReaction, type FeedPull } from '@/lib/pulls'
import { useMyProfile } from '@/lib/profile'
import { useNearbyBinders } from '@/lib/nearby'
import { PullCard } from '@/components/PullCard'
import { NearbyBinderRow } from '@/components/NearbyBinderRow'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { colors } from '@/lib/theme'
import type { ReactionKind } from '@/types'

type Segment = 'pulls' | 'nearby'
const RADIUS_KM = 25

function bump(p: FeedPull, kind: ReactionKind, delta: number): FeedPull {
  if (kind === 'fire') return { ...p, fire_count: Math.max(0, p.fire_count + delta) }
  if (kind === 'heart') return { ...p, heart_count: Math.max(0, p.heart_count + delta) }
  return { ...p, want_count: Math.max(0, p.want_count + delta) }
}

export default function SocialScreen() {
  const router = useRouter()
  const [segment, setSegment] = useState<Segment>('pulls')
  const { profile } = useMyProfile()

  // Pulls
  const { pulls, mine, loading, error, refresh } = useFeed()
  const [items, setItems] = useState<FeedPull[]>([])
  const [myReacts, setMyReacts] = useState<Record<string, Set<ReactionKind>>>({})
  useEffect(() => setItems(pulls), [pulls])
  useEffect(() => setMyReacts(mine), [mine])

  // Nearby binders
  const { binders, loading: bindersLoading, refresh: refreshBinders } = useNearbyBinders(
    profile?.lat ?? null,
    profile?.lng ?? null,
    RADIUS_KM
  )

  useFocusEffect(
    useCallback(() => {
      refresh()
      refreshBinders()
    }, [refresh, refreshBinders])
  )

  async function react(pull: FeedPull, kind: ReactionKind, on: boolean) {
    setMyReacts((prev) => {
      const set = new Set(prev[pull.id] ?? [])
      if (on) set.add(kind)
      else set.delete(kind)
      return { ...prev, [pull.id]: set }
    })
    setItems((prev) => prev.map((p) => (p.id === pull.id ? bump(p, kind, on ? 1 : -1) : p)))
    try {
      if (on) await addReaction(pull.id, kind)
      else await removeReaction(pull.id, kind)
    } catch {
      refresh()
    }
  }

  const shareCta = (
    <Pressable
      onPress={() => router.push('/(app)/pick-pull')}
      className="flex-row items-center gap-1 bg-primary rounded-lg px-3 py-1.5 active:opacity-80"
    >
      <Ionicons name="add" size={15} color={colors.primaryInk} />
      <Text className="text-primary-ink font-display-semibold text-sm">Share</Text>
    </Pressable>
  )

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader title="Social" subtitle="Fresh pulls & collections near you" right={shareCta} />

      {/* Segments */}
      <View className="mx-4 mb-2 flex-row bg-surface border border-subtle rounded-xl p-0.5">
        {([
          { key: 'pulls', label: 'Pulls' },
          { key: 'nearby', label: 'Nearby Binders' },
        ] as const).map((s) => {
          const active = segment === s.key
          return (
            <Pressable
              key={s.key}
              onPress={() => setSegment(s.key)}
              className={`flex-1 items-center py-2 rounded-[10px] ${active ? 'bg-primary/10' : ''}`}
            >
              <Text className={`text-sm font-display-semibold ${active ? 'text-primary' : 'text-muted-2'}`}>{s.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {segment === 'pulls' ? (
        loading && items.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-danger text-sm text-center font-display">{error}</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingTop: 6, paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
            renderItem={({ item }) => (
              <PullCard
                pull={item}
                mine={myReacts[item.id] ?? new Set()}
                onReact={(kind, on) => react(item, kind, on)}
                onOpenCard={() => router.push({ pathname: '/(app)/card/[id]', params: { id: item.card_id } })}
                onOpenTrader={() => router.push({ pathname: '/(app)/trader/[handle]', params: { handle: item.owner_handle } })}
              />
            )}
            ListEmptyComponent={
              <View className="items-center pt-16 px-10">
                <RadarLogo size={110} animated />
                <Text className="text-ink font-display-semibold text-base mt-6">No pulls yet</Text>
                <Text className="text-muted text-sm mt-2 text-center font-display">
                  Be the first — share a card you pulled and it shows up here.
                </Text>
                <Pressable
                  onPress={() => router.push('/(app)/pick-pull')}
                  className="flex-row items-center gap-1.5 mt-5 bg-primary rounded-xl px-4 py-2.5 active:opacity-90"
                >
                  <Ionicons name="camera" size={15} color={colors.primaryInk} />
                  <Text className="text-primary-ink font-display-semibold text-sm">Share a pull</Text>
                </Pressable>
              </View>
            }
          />
        )
      ) : bindersLoading && binders.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={binders}
          keyExtractor={(b) => b.binder_id}
          contentContainerStyle={{ paddingTop: 6, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={bindersLoading} onRefresh={refreshBinders} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <NearbyBinderRow
              binder={item}
              onPress={() => router.push({ pathname: '/(app)/binders/[id]', params: { id: item.binder_id } })}
            />
          )}
          ListEmptyComponent={
            <View className="items-center pt-16 px-10">
              <RadarLogo size={110} animated />
              <Text className="text-ink font-display-semibold text-base mt-6">No binders nearby</Text>
              <Text className="text-muted text-sm mt-2 text-center font-display">
                {profile?.lat
                  ? 'No public binders within range yet. Check back as more traders join.'
                  : 'Set your location in Profile to see collections near you.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
