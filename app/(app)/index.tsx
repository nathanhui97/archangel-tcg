import { useEffect, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { Link } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function HomeScreen() {
  const { session, signOut } = useAuth()
  const [handle, setHandle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!session) return
      const { data } = await supabase
        .from('profiles')
        .select('handle')
        .eq('id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      setHandle(data?.handle ?? null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session])

  if (loading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator color="#6366f1" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-950 px-6 pt-16">
      <Text className="text-gray-500 text-sm">Signed in as</Text>
      <Text className="text-3xl font-bold text-white mt-1">@{handle}</Text>

      <View className="mt-10 gap-3">
        <Link href="/(app)/cards" asChild>
          <Pressable className="bg-indigo-600 active:opacity-80 rounded-2xl px-5 py-4 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-white font-semibold text-base">Browse cards</Text>
              <Text className="text-indigo-200 text-xs mt-1">
                Search the Gundam catalog
              </Text>
            </View>
            <Text className="text-white text-xl">→</Text>
          </Pressable>
        </Link>

        <Link href="/(app)/binders" asChild>
          <Pressable className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex-row items-center justify-between active:opacity-70">
            <View className="flex-1 pr-3">
              <Text className="text-white font-semibold text-base">Binders</Text>
              <Text className="text-gray-500 text-xs mt-1">
                Cards you own — name them however you like
              </Text>
            </View>
            <Text className="text-gray-500 text-xl">→</Text>
          </Pressable>
        </Link>

        <Link href="/(app)/wantlist" asChild>
          <Pressable className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex-row items-center justify-between active:opacity-70">
            <View className="flex-1 pr-3">
              <Text className="text-white font-semibold text-base">Wantlist</Text>
              <Text className="text-gray-500 text-xs mt-1">
                Cards you&apos;re hunting — powers matches
              </Text>
            </View>
            <Text className="text-gray-500 text-xl">→</Text>
          </Pressable>
        </Link>

        <View className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
          <Text className="text-gray-400 font-semibold text-base">Matches</Text>
          <Text className="text-gray-500 text-xs mt-1">Coming next (Milestone 6)</Text>
        </View>
      </View>

      <Pressable
        onPress={signOut}
        className="mt-auto mb-12 self-center active:opacity-60"
      >
        <Text className="text-gray-500 text-sm">Sign out</Text>
      </Pressable>
    </View>
  )
}
