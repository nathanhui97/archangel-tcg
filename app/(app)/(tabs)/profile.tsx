import { useState } from 'react'
import { View, Text, Switch, ActivityIndicator, Pressable, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useMyProfile, updateProfile, deleteMyAccount } from '@/lib/profile'
import { useAuth } from '@/lib/auth'
import { useMyBinders, useMyPublicCards } from '@/lib/binders'
import { useMyWantlist } from '@/lib/wantlist'
import { useTrades } from '@/lib/trades'
import type { Game } from '@/types'
import { MonoLabel } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { colors } from '@/lib/theme'

const ALL_GAMES: { value: Game; label: string }[] = [
  { value: 'gundam', label: 'Gundam' },
  { value: 'one_piece', label: 'One Piece' },
]

export default function ProfileScreen() {
  const router = useRouter()
  const { profile, loading, refresh } = useMyProfile()
  const { signOut } = useAuth()
  const { binders } = useMyBinders()
  const { cards: forTradeCards } = useMyPublicCards()
  const { cardIds: wantedIds } = useMyWantlist()
  const { threads } = useTrades()

  const [togglingShip, setTogglingShip] = useState(false)
  const [savingGames, setSavingGames] = useState(false)
  const [capturingLoc, setCapturingLoc] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await deleteMyAccount()
      setConfirmDelete(false)
      // signOut clears auth state synchronously; AuthGate then routes to landing.
      await signOut()
    } catch (err) {
      setDeleting(false)
      setConfirmDelete(false)
      Alert.alert('Could not delete account', (err as Error).message)
    }
  }

  async function toggleWillingToShip(value: boolean) {
    if (!profile) return
    setTogglingShip(true)
    try {
      await updateProfile({ willing_to_ship: value })
      await refresh()
    } finally {
      setTogglingShip(false)
    }
  }

  async function toggleGame(g: Game) {
    if (!profile || savingGames) return
    const has = profile.games.includes(g)
    const next = has ? profile.games.filter((x) => x !== g) : [...profile.games, g]
    if (next.length === 0) return // keep at least one game selected
    setSavingGames(true)
    try {
      await updateProfile({ games: next })
      await refresh()
    } finally {
      setSavingGames(false)
    }
  }

  async function captureLocation() {
    if (capturingLoc) return
    setCapturingLoc(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Enable location access to set your area.')
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
      const lat = Math.round(pos.coords.latitude * 100) / 100
      const lng = Math.round(pos.coords.longitude * 100) / 100
      let city: string | null = null
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        const cityName = place?.city || place?.subregion || place?.district || null
        city = [cityName, place?.region].filter(Boolean).join(', ') || null
      } catch {
        /* city is optional */
      }
      await updateProfile({ lat, lng, city })
      await refresh()
    } catch {
      Alert.alert('Could not get location', 'Please try again.')
    } finally {
      setCapturingLoc(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center" edges={['top']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    )
  }

  const handle = profile?.handle ?? '—'
  const monogram = profile?.handle?.[0]?.toUpperCase() ?? '?'
  const hasLocation = !!(profile?.lat && profile?.lng)
  const gameLabels = (profile?.games ?? []).map((g) => (g === 'gundam' ? 'Gundam' : 'One Piece'))
  const subParts = [profile?.city, gameLabels.join(', ')].filter(Boolean)

  const stats: { count: number; label: string; href: Href }[] = [
    { count: binders.length, label: 'BINDERS', href: '/(app)/binders' },
    { count: forTradeCards.length, label: 'FOR TRADE', href: '/(app)/trades' },
    { count: wantedIds.size, label: 'WANTLIST', href: '/(app)/wantlist' },
    { count: threads.length, label: 'TRADES', href: '/(app)/(tabs)/messages' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}>
        {/* Identity header */}
        <View className="items-center mb-6">
          <View
            className="w-[84px] h-[84px] rounded-full bg-primary/10 border border-primary-soft items-center justify-center"
            style={{ shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }}
          >
            <Text className="text-primary font-mono-bold text-4xl">{monogram}</Text>
          </View>
          <Text className="text-ink text-[22px] font-mono-bold mt-3">@{handle}</Text>
          {subParts.length > 0 && (
            <Text className="text-muted text-sm mt-1 font-display">{subParts.join('  ·  ')}</Text>
          )}
        </View>

        {/* Stat tiles */}
        <View className="flex-row gap-2 mb-6">
          {stats.map((s) => (
            <Pressable
              key={s.label}
              onPress={() => router.push(s.href)}
              className="flex-1 bg-surface border border-subtle rounded-2xl py-3.5 items-center active:opacity-70"
            >
              <Text className="text-primary font-mono-bold text-2xl">{s.count}</Text>
              <Text className="text-label font-mono-medium text-[9px] uppercase tracking-[0.12em] mt-1">{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Nav rows */}
        <NavRow
          icon="eye-outline"
          title="View as traders see you"
          subtitle="Preview your public trader profile"
          onPress={() => router.push({ pathname: '/(app)/trader/[handle]', params: { handle } })}
        />
        <NavRow
          icon="share-social-outline"
          title="Invite players"
          subtitle="Bring your playgroup onto the radar"
          onPress={() => router.push('/(app)/invite')}
        />

        {/* Preferences */}
        <MonoLabel className="mb-2 mt-5">PREFERENCES</MonoLabel>
        <View className="bg-surface border border-subtle rounded-2xl overflow-hidden mb-2">
          {/* Location */}
          <Pressable onPress={captureLocation} disabled={capturingLoc} className="flex-row items-center px-4 py-3.5 active:opacity-70">
            <RowIcon icon="location-outline" tint={hasLocation ? colors.primary : colors.amber} />
            <View className="flex-1 ml-3">
              <Text className="text-ink font-display-medium">Location</Text>
              <Text className={`text-xs mt-0.5 font-display ${hasLocation ? 'text-muted' : 'text-amber'}`}>
                {hasLocation ? (profile?.city ?? 'Your area is set') : 'Not set — tap to use your area'}
              </Text>
            </View>
            {capturingLoc ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text className="text-primary text-xs font-display-medium mr-1">{hasLocation ? 'Update' : 'Set'}</Text>
            )}
          </Pressable>

          <View className="h-px bg-hair mx-4" />

          {/* Willing to ship */}
          <View className="flex-row items-center px-4 py-3.5">
            <RowIcon icon="paper-plane-outline" tint={colors.primary} />
            <View className="flex-1 ml-3 pr-3">
              <Text className="text-ink font-display-medium">Willing to ship</Text>
              <Text className="text-muted text-xs mt-0.5 font-display">Appear to traders beyond your local area</Text>
            </View>
            {togglingShip ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={profile?.willing_to_ship ?? false}
                onValueChange={toggleWillingToShip}
                trackColor={{ false: colors.track, true: colors.primary }}
                thumbColor={profile?.willing_to_ship ? colors.primaryInk : colors.muted2}
                ios_backgroundColor={colors.track}
              />
            )}
          </View>

          <View className="h-px bg-hair mx-4" />

          {/* Games */}
          <View className="px-4 py-3.5">
            <View className="flex-row items-center">
              <RowIcon icon="game-controller-outline" tint={colors.primary} />
              <Text className="flex-1 ml-3 text-ink font-display-medium">Games you play</Text>
              {savingGames && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            <View className="flex-row flex-wrap gap-2 mt-3 ml-[44px]">
              {ALL_GAMES.map((g) => {
                const active = profile?.games?.includes(g.value) ?? false
                return (
                  <Pressable
                    key={g.value}
                    onPress={() => toggleGame(g.value)}
                    className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg border active:opacity-70 ${
                      active ? 'bg-primary/10 border-primary' : 'border-subtle'
                    }`}
                  >
                    {active && <Ionicons name="checkmark" size={13} color={colors.primary} />}
                    <Text className={`text-xs font-display-medium ${active ? 'text-primary' : 'text-muted-2'}`}>{g.label}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>
        <Text className="text-faint text-xs mb-6 ml-1 font-display">Tap a game to add or remove it.</Text>

        {/* Account */}
        <MonoLabel className="mb-2">ACCOUNT</MonoLabel>
        <View className="bg-surface border border-subtle rounded-2xl overflow-hidden">
          <Pressable onPress={signOut} className="flex-row items-center px-4 py-3.5 active:opacity-70">
            <RowIcon icon="log-out-outline" tint={colors.muted2} />
            <Text className="flex-1 ml-3 text-ink font-display-medium">Sign out</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.faint2} />
          </Pressable>
          <View className="h-px bg-hair mx-4" />
          <Pressable onPress={() => setConfirmDelete(true)} className="flex-row items-center px-4 py-3.5 active:opacity-70">
            <RowIcon icon="trash-outline" tint={colors.danger} />
            <View className="flex-1 ml-3">
              <Text className="text-danger font-display-medium">Delete account</Text>
              <Text className="text-muted text-xs mt-0.5 font-display">Permanently remove your data</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete your account?"
        message="This permanently deletes your profile, binders, wantlist, and trades. This can't be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        destructive
        requireText="delete"
        onConfirm={handleDeleteAccount}
        onCancel={() => !deleting && setConfirmDelete(false)}
      />
    </SafeAreaView>
  )
}

function RowIcon({ icon, tint }: { icon: React.ComponentProps<typeof Ionicons>['name']; tint: string }) {
  return (
    <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
      <Ionicons name={icon} size={18} color={tint} />
    </View>
  )
}

const NavRow = ({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  title: string
  subtitle: string
  onPress?: () => void
}) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center bg-surface border border-subtle rounded-2xl px-4 py-3.5 mb-2.5 active:opacity-70"
  >
    <RowIcon icon={icon} tint={colors.primary} />
    <View className="flex-1 ml-3">
      <Text className="text-ink font-display-semibold">{title}</Text>
      <Text className="text-muted text-xs mt-0.5 font-display">{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.faint2} />
  </Pressable>
)
