import { View, Text, Pressable } from 'react-native'
import { Link } from 'expo-router'

export default function LandingScreen() {
  return (
    <View className="flex-1 bg-gray-950 items-center justify-center px-6">
      <View className="items-center mb-14">
        <Text className="text-5xl font-bold text-white tracking-tight">ArchangelTCG</Text>
        <Text className="text-gray-400 text-lg mt-3">Trade cards with local players</Text>
        <Text className="text-gray-500 text-sm mt-1">Gundam Card Game</Text>
      </View>

      <View className="w-full max-w-xs">
        <Link href="/(auth)/login" asChild>
          <Pressable className="bg-indigo-600 py-4 rounded-2xl items-center active:opacity-80">
            <Text className="text-white font-semibold text-base">Get Started</Text>
          </Pressable>
        </Link>
        <Text className="text-gray-500 text-xs text-center mt-4">
          We&apos;ll email you a 6-digit code to sign in. No password needed.
        </Text>
      </View>
    </View>
  )
}
