import { useState } from 'react'
import { View, Text, Switch, ActivityIndicator, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMyProfile, updateProfile, deleteMyAccount } from '@/lib/profile'
import { useAuth } from '@/lib/auth'
import { Button, MonoLabel, Card } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { colors } from '@/lib/theme'

export default function ProfileScreen() {
  const { profile, loading, refresh } = useMyProfile()
  const { signOut } = useAuth()
  const [togglingShip, setTogglingShip] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await deleteMyAccount()
      await signOut() // session is now invalid; AuthGate redirects to landing
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center" edges={['top']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    )
  }

  const hasLocation = !!(profile?.lat && profile?.lng)

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-5 pt-6">
        {/* Avatar + handle */}
        <View className="items-center mb-8">
          <View
            className="w-[78px] h-[78px] rounded-full bg-surface border border-primary-soft items-center justify-center"
            style={{ shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }}
          >
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <Text className="text-ink text-[22px] font-mono-bold mt-3">@{profile?.handle ?? '—'}</Text>
        </View>

        {/* Location */}
        <MonoLabel className="mb-2">LOCATION</MonoLabel>
        <Card className="px-4 py-4 mb-4 flex-row items-center">
          <Ionicons name="location-outline" size={18} color={hasLocation ? colors.primary : colors.amber} />
          <View className="flex-1 ml-3">
            <View className="flex-row items-center gap-1.5">
              {hasLocation && (
                <View
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  style={{ shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }}
                />
              )}
              <Text className={`text-sm font-display-medium ${hasLocation ? 'text-ink' : 'text-amber'}`}>
                {hasLocation ? profile?.city ?? 'Your area is set' : 'No location set'}
              </Text>
            </View>
            <Text className="text-muted text-xs mt-0.5 font-display">
              {hasLocation ? 'Shown as your general area' : 'Required to see and appear in local Browse'}
            </Text>
          </View>
        </Card>

        {/* Willing to ship */}
        <Card className="px-4 py-4 mb-4 flex-row items-center">
          <View className="flex-1 pr-4">
            <Text className="text-ink font-display-medium">Willing to ship</Text>
            <Text className="text-muted text-xs mt-0.5 font-display">Show your trade cards to everyone</Text>
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
        </Card>

        {/* Games */}
        {profile?.games && profile.games.length > 0 && (
          <>
            <MonoLabel className="mb-2">GAMES</MonoLabel>
            <View className="flex-row flex-wrap gap-2 mb-8">
              {profile.games.map(g => (
                <View key={g} className="bg-primary/10 border border-primary rounded-lg px-3 py-1.5">
                  <Text className="text-primary text-xs font-display-medium">
                    {g === 'gundam' ? 'Gundam' : 'One Piece'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Invite */}
        <Link href="/(app)/invite" asChild>
          <Pressable className="flex-row items-center bg-primary/10 border border-primary-soft rounded-2xl px-4 py-3.5 mb-4 active:opacity-80">
            <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3">
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-ink font-display-semibold">Invite players</Text>
              <Text className="text-muted text-xs mt-0.5 font-display">Bring your playgroup onto the radar</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </Link>

        {/* Sign out */}
        <Button title="Sign out" variant="danger" onPress={signOut} />

        {/* Delete account (Apple requirement) */}
        <Pressable onPress={() => setConfirmDelete(true)} className="items-center mt-5 py-2 active:opacity-60">
          <Text className="text-danger text-sm font-display-medium">Delete account</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete your account?"
        message="This permanently deletes your profile, binders, wantlist, and trades. This can't be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        destructive
        onConfirm={handleDeleteAccount}
        onCancel={() => !deleting && setConfirmDelete(false)}
      />
    </SafeAreaView>
  )
}
