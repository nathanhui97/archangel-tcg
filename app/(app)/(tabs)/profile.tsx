import { useState } from 'react'
import { View, Text, Pressable, Switch, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMyProfile, updateProfile } from '@/lib/profile'
import { useAuth } from '@/lib/auth'

export default function ProfileScreen() {
  const { profile, loading, refresh } = useMyProfile()
  const { signOut } = useAuth()
  const [togglingShip, setTogglingShip] = useState(false)

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
      <SafeAreaView className="flex-1 bg-gray-950 items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <View className="px-4 pt-6">

        {/* Handle */}
        <View className="mb-6">
          <Text className="text-gray-500 text-xs mb-1 uppercase tracking-wider">Handle</Text>
          <Text className="text-white text-2xl font-bold">@{profile?.handle ?? '—'}</Text>
        </View>

        {/* Location */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 mb-3">
          <Text className="text-gray-400 text-xs uppercase tracking-wider mb-2">Location</Text>
          {profile?.lat && profile?.lng ? (
            <View>
              <Text className="text-green-400 text-sm font-medium">Location set</Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                Approx. {profile.lat}°, {profile.lng}° (rounded for privacy)
              </Text>
            </View>
          ) : (
            <View>
              <Text className="text-amber-400 text-sm font-medium">No location set</Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                Required to see and appear in local Browse results
              </Text>
            </View>
          )}
        </View>

        {/* Willing to ship */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-white font-medium">Willing to ship</Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                Your trade cards appear in Browse for all users, not just nearby ones
              </Text>
            </View>
            {togglingShip ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Switch
                value={profile?.willing_to_ship ?? false}
                onValueChange={toggleWillingToShip}
                trackColor={{ false: '#374151', true: '#4f46e5' }}
                thumbColor="#ffffff"
              />
            )}
          </View>
        </View>

        {/* Games */}
        {profile?.games && profile.games.length > 0 && (
          <View className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 mb-3">
            <Text className="text-gray-400 text-xs uppercase tracking-wider mb-2">Games</Text>
            <View className="flex-row flex-wrap gap-2">
              {profile.games.map(g => (
                <View key={g} className="bg-indigo-900/50 border border-indigo-800/50 rounded-full px-3 py-1">
                  <Text className="text-indigo-300 text-xs font-medium">
                    {g === 'gundam' ? 'Gundam Card Game' : 'One Piece Card Game'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          className="mt-6 self-center active:opacity-60"
        >
          <Text className="text-gray-500 text-sm">Sign out</Text>
        </Pressable>

      </View>
    </SafeAreaView>
  )
}
