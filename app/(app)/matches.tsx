import { useCallback } from 'react'
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { Stack, useRouter, useFocusEffect, Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMyProfile } from '@/lib/profile'
import { useMatches, type Match } from '@/lib/matches'
import { Avatar, CardThumb, MonoLabel } from '@/components/ui'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { colors } from '@/lib/theme'

function StrengthBars({ strength }: { strength: number }) {
  return (
    <View className="flex-row items-end gap-1">
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{ width: 4, height: 8 + i * 5, borderRadius: 1 }}
          className={i < strength ? 'bg-primary' : 'bg-track'}
        />
      ))}
    </View>
  )
}

function ThumbRow({ uris }: { uris: (string | null)[] }) {
  const shown = uris.slice(0, 4)
  const extra = uris.length - shown.length
  return (
    <View className="flex-row items-center gap-1.5 mt-2">
      {shown.map((u, i) => (
        <CardThumb key={i} uri={u} className="w-9 h-[50px]" radius="rounded" />
      ))}
      {extra > 0 && <Text className="text-muted text-xs ml-1 font-mono">+{extra}</Text>}
    </View>
  )
}

function MatchCard({ match }: { match: Match }) {
  const router = useRouter()
  const distLabel = match.distance_km !== null ? `${match.distance_km} km` : match.ships ? 'Ships' : 'Nearby'

  return (
    <View className="bg-surface border border-subtle rounded-2xl p-4 mb-3">
      <View className="flex-row items-center">
        <Avatar handle={match.handle} size={42} />
        <View className="flex-1 ml-3">
          <Text className="text-ink font-mono text-sm">@{match.handle}</Text>
          <Text className="text-muted text-xs mt-0.5 font-display">{distLabel}</Text>
        </View>
        <StrengthBars strength={match.strength} />
      </View>

      {match.youGet.length > 0 && (
        <View className="mt-3.5">
          <MonoLabel>YOU GET · {match.youGet.length}</MonoLabel>
          <ThumbRow uris={match.youGet.map((c) => c.card_image_url)} />
        </View>
      )}
      {match.youGive.length > 0 && (
        <View className="mt-3">
          <MonoLabel>YOU GIVE · {match.youGive.length}</MonoLabel>
          <ThumbRow uris={match.youGive.map((w) => w.card_image_url)} />
        </View>
      )}

      <Pressable
        onPress={() => router.push({ pathname: '/(app)/trader/[handle]', params: { handle: match.handle } })}
        className="flex-row items-center justify-center gap-2 mt-4 bg-primary/10 border border-primary rounded-xl py-2.5 active:opacity-70"
      >
        <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
        <Text className="text-primary font-display-semibold text-sm">View trader</Text>
      </Pressable>
    </View>
  )
}

export default function MatchesScreen() {
  const { profile } = useMyProfile()
  const { matches, loading, refresh } = useMatches(profile?.lat ?? null, profile?.lng ?? null, 25)

  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: 'Matches' }} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.handle}
          contentContainerStyle={{ padding: 20, paddingTop: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            matches.length > 0 ? (
              <Text className="text-muted text-sm mb-4 font-display">Nearby traders you have overlap with.</Text>
            ) : null
          }
          renderItem={({ item }) => <MatchCard match={item} />}
          ListEmptyComponent={
            <View className="items-center pt-16 px-6">
              <RadarLogo size={140} animated />
              <Text className="text-ink font-display-semibold text-base mt-6">No matches yet</Text>
              <Text className="text-muted text-sm mt-2 text-center font-display">
                A match lights up when someone nearby wants a card you have — and you want one of theirs. Add more cards to widen your radar.
              </Text>
              <Link href="/(app)/wantlist/add" asChild>
                <Pressable
                  className="mt-6 bg-primary px-6 py-3 rounded-2xl active:opacity-90"
                  style={{ shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } }}
                >
                  <Text className="text-primary-ink font-display-bold">Add to wantlist</Text>
                </Pressable>
              </Link>
            </View>
          }
        />
      )}
    </View>
  )
}
