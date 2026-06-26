import { View, Text, Pressable } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { CardSearch } from '@/components/CardSearch'

export default function BrowseCardsScreen() {
  const router = useRouter()

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: 'Browse Cards' }} />

      <View className="pt-4">
        <CardSearch
          onSelect={(card) => {
            // For Milestone 3 this just navigates — Milestone 4 will let users
            // add this card to a binder from here.
            console.log('Tapped card:', card.id, card.name)
          }}
        />
      </View>
    </View>
  )
}
