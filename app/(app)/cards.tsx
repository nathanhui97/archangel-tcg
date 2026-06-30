import { View } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { CardSearch } from '@/components/CardSearch'

export default function BrowseCardsScreen() {
  const router = useRouter()

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: 'Browse Cards' }} />

      <View className="pt-4">
        <CardSearch
          onSelect={(card) => router.push({ pathname: '/(app)/card/[id]', params: { id: card.id } })}
        />
      </View>
    </View>
  )
}
