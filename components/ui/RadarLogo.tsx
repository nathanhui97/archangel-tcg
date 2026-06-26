import { useEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { Circle, Rect, Line, Defs, RadialGradient, Stop } from 'react-native-svg'
import { colors } from '@/lib/theme'

type Props = {
  /** Pixel size of the square mark. */
  size?: number
  /** When true, a radar sweep line rotates continuously (landing / empty states). */
  animated?: boolean
  /** Mark color variant. */
  tone?: 'primary' | 'ink' | 'inverse'
}

/**
 * The Bindar mark: concentric radar rings + center dot + a tilted "card blip"
 * at the upper-right. This is the canonical logo — reuse for app icon, splash,
 * empty-state radars, and invite QR center.
 */
export function RadarLogo({ size = 64, animated = false, tone = 'primary' }: Props) {
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!animated) return
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [animated, spin])

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  const mark = tone === 'inverse' ? colors.primaryInk : tone === 'ink' ? colors.ink : colors.primary

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        {/* concentric rings */}
        <Circle cx={32} cy={32} r={24} stroke={mark} strokeOpacity={0.3} strokeWidth={2} fill="none" />
        <Circle cx={32} cy={32} r={13.5} stroke={mark} strokeOpacity={0.55} strokeWidth={2} fill="none" />
        {/* center dot */}
        <Circle cx={32} cy={32} r={3.4} fill={mark} />
        {/* tilted card "blip" at upper-right */}
        <Rect
          x={40}
          y={10}
          width={13}
          height={17}
          rx={2.5}
          fill={mark}
          transform="rotate(-14 46.5 18.5)"
        />
      </Svg>

      {animated && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            transform: [{ rotate }],
          }}
        >
          <Svg width={size} height={size} viewBox="0 0 64 64">
            <Defs>
              <RadialGradient id="sweep" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.5} />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Line x1={32} y1={32} x2={32} y2={8} stroke={colors.primary} strokeOpacity={0.7} strokeWidth={1.5} />
            <Circle cx={32} cy={8} r={2} fill="url(#sweep)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  )
}
