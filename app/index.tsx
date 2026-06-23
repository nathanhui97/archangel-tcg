import { View, Text, Pressable } from 'react-native'
import { Link } from 'expo-router'

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-gray-950 items-center justify-center px-6">
      <View className="items-center mb-14">
        <Text className="text-5xl font-bold text-white tracking-tight">ArchangelTCG</Text>
        <Text className="text-gray-400 text-lg mt-3">Trade cards with local players</Text>
        <Text className="text-gray-500 text-sm mt-1">Gundam Card Game</Text>
      </View>

      <View className="w-full max-w-xs gap-3">
        <Link href="/(auth)/login" asChild>
          <Pressable className="bg-indigo-600 py-4 rounded-2xl items-center active:opacity-80">
            <Text className="text-white font-semibold text-base">Sign In</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/signup" asChild>
          <Pressable className="bg-gray-800 py-4 rounded-2xl items-center active:opacity-80">
            <Text className="text-white font-semibold text-base">Create Account</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}
