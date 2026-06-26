import { View, Text } from 'react-native'
import { colors } from '@/lib/theme'

/** Header distance pill — a glowing radar dot + "25 km". */
export function DistanceTag({ km }: { km: number }) {
  return (
    <View className="flex-row items-center gap-1.5 bg-primary/10 border border-primary-soft rounded-lg px-2.5 py-1">
      <View
        className="w-1.5 h-1.5 rounded-full bg-primary"
        style={{ shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }}
      />
      <Text className="text-primary text-xs font-mono-medium">{km} km</Text>
    </View>
  )
}
