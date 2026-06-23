import { useEffect, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
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

      <View className="mt-12 bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <Text className="text-white font-semibold text-base">You&apos;re all set up.</Text>
        <Text className="text-gray-400 text-sm mt-2">
          Next up: build a binder of cards you own, add cards you want, and we&apos;ll
          match you with local Gundam players to trade.
        </Text>
        <Text className="text-gray-500 text-xs mt-3">
          (Binders + matching come in the next milestones.)
        </Text>
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
