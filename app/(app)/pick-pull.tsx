import { View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { CardPicker } from '@/components/CardPicker'

/** Entry from the Social ＋: pick which card you pulled, then go share it. */
export default function PickPullScreen() {
  const router = useRouter()
  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: 'Share a pull' }} />
      <CardPicker
        title="Which card did you pull?"
        subtitle="Pick the card to show off"
        onSubmit={(ids) => {
          if (ids[0]) router.replace({ pathname: '/(app)/share-pull', params: { cardId: ids[0] } })
        }}
        submitWithLabel={(n) => (n > 0 ? 'Continue' : 'Pick a card')}
      />
    </View>
  )
}
