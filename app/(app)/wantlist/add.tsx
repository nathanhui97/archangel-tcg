import { View } from 'react-native'
import { Stack } from 'expo-router'
import { CardPicker } from '@/components/CardPicker'
import { addToWantlist, useMyWantlist } from '@/lib/wantlist'

export default function AddToWantlistScreen() {
  const { cardIds, refresh } = useMyWantlist()

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <CardPicker
        title="Add to wantlist"
        addNoun="wantlist"
        addedIds={cardIds}
        onAdd={async (ids) => {
          for (const id of ids) {
            // Skip duplicates silently — addedIds already hides cards on the list.
            try {
              await addToWantlist(id)
            } catch {
              /* ignore */
            }
          }
          await refresh()
        }}
      />
    </View>
  )
}
