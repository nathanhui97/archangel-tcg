import { ReactNode, useEffect, useRef } from 'react'
import {
  View, Text, Pressable, Image, ActivityIndicator, Animated,
  type PressableProps, type ViewProps,
} from 'react-native'
import { colors, avatarTint } from '@/lib/theme'

/* ───────────────────────── Avatar (handle initial, tinted) ───────────────────────── */

export function Avatar({ handle, size = 38 }: { handle: string; size?: number }) {
  const tint = avatarTint(handle || '?')
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${tint}29`,
        borderColor: `${tint}55`,
        borderWidth: 1,
      }}
      className="items-center justify-center"
    >
      <Text style={{ color: tint, fontSize: Math.round(size * 0.42) }} className="font-display-bold">
        {(handle || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  )
}

/* ───────────────────────── Cursor (blinking caret) ───────────────────────── */

export function Cursor({ height = 28 }: { height?: number }) {
  const opacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 0, delay: 550, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 0, delay: 550, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return <Animated.View style={{ width: 2, height, backgroundColor: colors.primary, opacity, borderRadius: 1 }} />
}

/* ───────────────────────── Button ───────────────────────── */

type ButtonProps = {
  title: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'lg' | 'md' | 'sm'
  loading?: boolean
  disabled?: boolean
  trailing?: ReactNode
  leading?: ReactNode
  className?: string
}

export function Button({
  title, onPress, variant = 'primary', size = 'lg',
  loading = false, disabled = false, trailing, leading, className = '',
}: ButtonProps) {
  const isDisabled = disabled || loading
  const pad = size === 'lg' ? 'py-4' : size === 'md' ? 'py-3' : 'py-2'
  const textSize = size === 'sm' ? 'text-sm' : 'text-base'

  const base =
    variant === 'primary'
      ? isDisabled
        ? 'bg-surface-control'
        : 'bg-primary active:opacity-90'
      : variant === 'danger'
        ? 'bg-transparent border border-danger/35 active:opacity-70'
        : 'bg-transparent border border-primary/30 active:opacity-70'

  const labelColor =
    variant === 'primary'
      ? isDisabled ? 'text-faint' : 'text-primary-ink'
      : variant === 'danger' ? 'text-danger' : 'text-primary'

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={
        variant === 'primary' && !isDisabled
          ? { shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } }
          : undefined
      }
      className={`flex-row items-center justify-center gap-2 rounded-2xl ${pad} ${base} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.primaryInk : colors.primary} />
      ) : (
        <>
          {leading}
          <Text className={`font-display-bold ${textSize} ${labelColor}`}>{title}</Text>
          {trailing}
        </>
      )}
    </Pressable>
  )
}

/* ───────────────────────── Chip ───────────────────────── */

export function Chip({
  label, active = false, onPress, mono = false,
}: { label: string; active?: boolean; onPress?: () => void; mono?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-lg border active:opacity-70 ${
        active ? 'bg-primary/10 border-primary' : 'border-subtle bg-transparent'
      }`}
    >
      <Text
        className={`text-xs ${mono ? 'font-mono-medium' : 'font-display-medium'} ${
          active ? 'text-primary' : 'text-muted-2'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/* ───────────────────────── Badge ───────────────────────── */

type BadgeTone = 'want' | 'count' | 'pending' | 'have' | 'outline' | 'foil'

export function Badge({ label, tone = 'outline', icon }: { label: string; tone?: BadgeTone; icon?: ReactNode }) {
  const map: Record<BadgeTone, string> = {
    want: 'border border-primary',
    outline: 'border border-primary',
    count: 'bg-primary/10',
    pending: 'bg-amber/10 border border-amber/40',
    have: 'bg-primary',
    foil: '',
  }
  const text: Record<BadgeTone, string> = {
    want: 'text-primary',
    outline: 'text-primary',
    count: 'text-primary',
    pending: 'text-amber',
    have: 'text-primary-ink',
    foil: 'text-gold',
  }
  return (
    <View className={`flex-row items-center gap-1 rounded px-1.5 py-0.5 ${map[tone]}`}>
      {icon}
      <Text className={`font-mono-bold text-[9px] tracking-wider uppercase ${text[tone]}`}>{label}</Text>
    </View>
  )
}

/* ───────────────────────── CardThumb ───────────────────────── */

export function CardThumb({
  uri, className = 'w-12 h-16', radius = 'rounded-md',
}: { uri?: string | null; className?: string; radius?: string }) {
  return uri ? (
    <Image
      source={{ uri }}
      resizeMode="cover"
      className={`${className} ${radius} bg-surface-raised border border-subtle`}
    />
  ) : (
    <View className={`${className} ${radius} bg-surface-raised border border-subtle`} />
  )
}

/* ───────────────────────── StatusDot ───────────────────────── */

export function StatusDot({ on, label }: { on: boolean; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-primary' : 'bg-track'}`}
        style={on ? { shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } } : undefined}
      />
      <Text className={`text-xs font-display-medium ${on ? 'text-primary' : 'text-faint-2'}`}>{label}</Text>
    </View>
  )
}

/* ───────────────────────── MonoLabel (section header) ───────────────────────── */

export function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Text className={`font-mono-medium text-[11px] uppercase tracking-[0.14em] text-label ${className}`}>
      {children}
    </Text>
  )
}

/* ───────────────────────── Card (surface container) ───────────────────────── */

export function Card({ children, className = '', ...rest }: ViewProps & { children: ReactNode; className?: string }) {
  return (
    <View className={`bg-surface border border-subtle rounded-2xl ${className}`} {...rest}>
      {children}
    </View>
  )
}

/* ───────────────────────── PressRow (tappable surface row) ───────────────────────── */

export function PressRow({ children, className = '', ...rest }: PressableProps & { children: ReactNode; className?: string }) {
  return (
    <Pressable className={`bg-surface border border-subtle rounded-2xl active:opacity-70 ${className}`} {...rest}>
      {children}
    </Pressable>
  )
}
