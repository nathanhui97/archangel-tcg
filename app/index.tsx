import { View, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { Button } from '@/components/ui'
import { colors } from '@/lib/theme'

export default function LandingScreen() {
  const router = useRouter()
  return (
    <View className="flex-1 bg-bg items-center justify-center px-7">
      {/* radial green glow + radar */}
      <View className="items-center">
        <RadarLogo size={184} animated />
        <Text
          className="text-5xl font-display-bold text-ink mt-12 tracking-tight"
          style={{ textShadowColor: colors.primary, textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } }}
        >
          BINDAR
        </Text>
        <Text className="text-muted text-base mt-3 font-display">A radar for binders near you</Text>
      </View>

      <View className="w-full max-w-xs mt-16">
        <Button title="Get Started" onPress={() => router.push('/(auth)/login')} trailing={<Text className="text-primary-ink font-mono-bold text-base">→</Text>} />
      </View>

      <Text className="absolute bottom-12 font-mono-medium text-[11px] tracking-[0.14em] text-faint">
        GUNDAM CARD GAME · LOCAL TRADES
      </Text>
    </View>
  )
}
