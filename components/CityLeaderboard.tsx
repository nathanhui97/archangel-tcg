import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, Modal, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useMyProfile } from '@/lib/profile'
import { useCityLeaderboard, useLeaderboardCities, type LeaderboardMetric } from '@/lib/leaderboard'
import { Avatar, MonoLabel } from '@/components/ui'
import { formatPrice } from '@/lib/prices'
import { colors } from '@/lib/theme'

const METRICS: { key: LeaderboardMetric; label: string }[] = [
  { key: 'value', label: 'Value' },
  { key: 'alt', label: 'Alt' },
  { key: 'count', label: 'Cards' },
]

function medal(rank: number): string | null {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
}

function scoreLabel(metric: LeaderboardMetric, s: number): string {
  if (metric === 'value') return `≈ ${formatPrice(s)}`
  if (metric === 'alt') return `${s} alt`
  return `${s} cards`
}

/** City leaderboard: ranked collectors (verified public binders), with a city
 *  picker and a Value / Alt / Cards toggle. Used as the Social "Leaderboard" tab. */
export function CityLeaderboard() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useMyProfile()
  const [city, setCity] = useState<string | null>(null)
  const [metric, setMetric] = useState<LeaderboardMetric>('value')
  const [pickerOpen, setPickerOpen] = useState(false)

  // Default to the user's own city once the profile loads.
  useEffect(() => {
    if (city === null && profile?.city) setCity(profile.city)
  }, [profile?.city, city])

  const { rows, myRank, loading, refresh } = useCityLeaderboard(city, metric)
  const { cities } = useLeaderboardCities()

  if (!profile?.city && !city) {
    return (
      <View className="flex-1 items-center justify-center px-10">
        <Ionicons name="location-outline" size={30} color={colors.faint} />
        <Text className="text-muted text-sm text-center mt-3 font-display">
          Set your location in Profile to see your city’s leaderboard.
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1">
      {/* City selector + metric toggle */}
      <View className="px-5 pt-1 pb-2">
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="flex-row items-center gap-1 self-start active:opacity-70 mb-2.5"
        >
          <Ionicons name="location" size={15} color={colors.primary} />
          <Text className="text-ink font-display-bold text-base">{city ?? 'Pick a city'}</Text>
          <Ionicons name="chevron-down" size={15} color={colors.muted2} />
        </Pressable>

        <View className="flex-row bg-surface border border-subtle rounded-xl p-0.5">
          {METRICS.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setMetric(m.key)}
              className={`flex-1 items-center py-2 rounded-[10px] ${metric === m.key ? 'bg-primary/10' : ''}`}
            >
              <Text className={`text-sm font-display-semibold ${metric === m.key ? 'text-primary' : 'text-muted-2'}`}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Your rank */}
      {myRank ? (
        <View className="mx-5 mb-2 flex-row items-center bg-primary/10 border border-primary rounded-xl px-4 py-2.5">
          <Text className="text-primary font-mono-bold text-base mr-2">#{myRank.rank}</Text>
          <Text className="text-ink font-display-medium text-sm flex-1">You’re #{myRank.rank} in {city}</Text>
          <Text className="text-primary font-mono-bold text-xs">{scoreLabel(metric, myRank.score)}</Text>
        </View>
      ) : (
        <View className="mx-5 mb-2 bg-surface border border-subtle rounded-xl px-4 py-2.5">
          <Text className="text-muted text-xs font-display">
            Not ranked here yet — verify a public binder to climb the board.
          </Text>
        </View>
      )}

      {loading && rows.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.user_id}
          contentContainerStyle={{ paddingTop: 2, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const m = medal(item.rank)
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/(app)/trader/[handle]', params: { handle: item.handle } })}
                className="flex-row items-center mx-5 mb-2 bg-surface border border-subtle rounded-2xl px-4 py-3 active:opacity-80"
              >
                <View className="w-8 items-center">
                  {m ? <Text className="text-lg">{m}</Text> : <Text className="text-muted-2 font-mono-bold text-sm">{item.rank}</Text>}
                </View>
                <Avatar handle={item.handle} size={34} />
                <View className="flex-1 ml-2.5 flex-row items-center gap-1">
                  <Text className="text-ink font-mono-bold text-sm">@{item.handle}</Text>
                  {item.verified_at ? <Ionicons name="checkmark-circle" size={13} color={colors.primary} /> : null}
                </View>
                <Text className="text-primary font-mono-bold text-sm">{scoreLabel(metric, item.score)}</Text>
              </Pressable>
            )
          }}
          ListEmptyComponent={
            <View className="items-center pt-14 px-10">
              <Text className="text-4xl">🏆</Text>
              <Text className="text-ink font-display-semibold text-base mt-4">No ranked collectors in {city} yet</Text>
              <Text className="text-muted text-sm mt-2 text-center font-display">
                Verify a public binder and you could be #1.
              </Text>
            </View>
          }
        />
      )}

      {/* City picker */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable onPress={() => setPickerOpen(false)} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(2,4,3,0.55)' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-sheet rounded-t-[26px] border-t border-primary-soft px-6 pt-3"
            style={{ paddingBottom: insets.bottom + 16, maxHeight: '70%' }}
          >
            <View className="self-center w-9 h-1 rounded-full bg-track mb-4" />
            <MonoLabel className="mb-3">PICK A CITY</MonoLabel>
            <FlatList
              data={cities}
              keyExtractor={(c) => c.city}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCity(item.city)
                    setPickerOpen(false)
                  }}
                  className="flex-row items-center justify-between py-3 border-b border-hair active:opacity-70"
                >
                  <Text className={`font-display-medium text-base ${item.city === city ? 'text-primary' : 'text-ink'}`}>
                    {item.city}
                  </Text>
                  <Text className="text-faint text-xs font-mono">{item.collectors}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text className="text-muted text-sm font-display py-4">No cities with leaderboards yet.</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
