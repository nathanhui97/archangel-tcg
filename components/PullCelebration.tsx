import { useEffect } from 'react'
import { View, Text, Modal, Pressable, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated'
import { normRarity } from '@/lib/cards'
import { colors } from '@/lib/theme'
import type { NotableCard } from '@/lib/pulls'

/** One sparkle that bursts outward from the card and fades, then loops. */
function Sparkle({ angle, distance, delay, size }: { angle: number; distance: number; delay: number; size: number }) {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, false))
  }, [p])
  const rad = (angle * Math.PI) / 180
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(rad) * distance * p.value },
      { translateY: Math.sin(rad) * distance * p.value },
      { scale: interpolate(p.value, [0, 0.35, 1], [0, 1.15, 0]) },
    ],
    opacity: interpolate(p.value, [0, 0.4, 1], [0, 1, 0]),
  }))
  return (
    <Animated.View style={[{ position: 'absolute' }, style]}>
      <Ionicons name="sparkles" size={size} color={colors.primary} />
    </Animated.View>
  )
}

const SPARKS = [
  { angle: -90, distance: 92, delay: 0, size: 18 },
  { angle: -35, distance: 104, delay: 160, size: 14 },
  { angle: 30, distance: 96, delay: 320, size: 16 },
  { angle: 90, distance: 88, delay: 90, size: 13 },
  { angle: 150, distance: 100, delay: 260, size: 15 },
  { angle: -150, distance: 98, delay: 420, size: 14 },
  { angle: 0, distance: 110, delay: 520, size: 12 },
  { angle: 180, distance: 106, delay: 200, size: 12 },
]

type Props = {
  visible: boolean
  card: NotableCard | null
  onShare: () => void
  onDismiss: () => void
}

/** Themed "Nice pull!" celebration — replaces the native alert with an on-brand
 *  card reveal + phosphor-green sparkle burst. */
export function PullCelebration({ visible, card, onShare, onDismiss }: Props) {
  const pop = useSharedValue(0)
  useEffect(() => {
    if (visible) {
      pop.value = 0
      pop.value = withSpring(1, { damping: 12, stiffness: 180, mass: 0.7 })
    }
  }, [visible, pop])

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pop.value, [0, 1], [0.6, 1]) }, { rotate: `${interpolate(pop.value, [0, 1], [-8, 0])}deg` }],
    opacity: pop.value,
  }))

  const grade = card?.is_alt_art ? 'ALT' : normRarity(card?.rarity) || null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <Pressable
        onPress={onDismiss}
        className="flex-1 items-center justify-center px-10"
        style={{ backgroundColor: 'rgba(2,4,3,0.72)' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full bg-surface-sheet rounded-3xl border border-primary-soft px-6 pt-7 pb-5 items-center"
        >
          <Text className="text-primary font-mono-bold text-xs tracking-[3px] mb-4">NICE PULL</Text>

          {/* Card + sparkle burst */}
          <View className="items-center justify-center my-1" style={{ width: 150, height: 200 }}>
            {SPARKS.map((s, i) => (
              <Sparkle key={i} {...s} />
            ))}
            <Animated.View
              style={[
                cardStyle,
                { shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 26, shadowOffset: { width: 0, height: 0 } },
              ]}
            >
              <View className="w-[120px] h-[168px] rounded-xl overflow-hidden border border-primary-soft bg-surface-raised">
                {card?.image_url ? (
                  <Image source={{ uri: card.image_url }} resizeMode="cover" className="w-full h-full" />
                ) : null}
              </View>
              {grade ? (
                <View className="absolute -top-2 -right-2 flex-row items-center gap-0.5 bg-primary rounded-md px-1.5 py-0.5">
                  {card?.is_alt_art ? <Ionicons name="sparkles" size={9} color={colors.primaryInk} /> : null}
                  <Text className="text-primary-ink font-mono-bold text-[10px] tracking-wider">{grade}</Text>
                </View>
              ) : null}
            </Animated.View>
          </View>

          <Text className="text-ink font-display-bold text-lg text-center mt-4" numberOfLines={2}>
            {card?.name ?? ''}
          </Text>
          <Text className="text-muted text-sm font-display text-center mt-1">Show it off on the feed?</Text>

          <View className="flex-row gap-3 mt-6 w-full">
            <Pressable
              onPress={onDismiss}
              className="flex-1 items-center py-3.5 rounded-2xl border border-subtle active:opacity-70"
            >
              <Text className="text-muted-2 font-display-semibold text-base">Not now</Text>
            </Pressable>
            <Pressable
              onPress={onShare}
              style={{ shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } }}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-primary active:opacity-90"
            >
              <Ionicons name="camera" size={16} color={colors.primaryInk} />
              <Text className="text-primary-ink font-display-bold text-base">Share it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
