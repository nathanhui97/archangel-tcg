import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COMING_SOON_GAMES } from '@/lib/games'
import { secureStorage } from '@/lib/secure-storage'
import { colors } from '@/lib/theme'

const STORAGE_KEY = 'comingSoonGames.dismissed'

/**
 * Compact promo strip teasing games that aren't live yet. Reads the registry.
 * Dismissible like a notification — the closed state persists across launches.
 */
export function ComingSoonGames({ className = '' }: { className?: string }) {
  // null = still reading storage (render nothing to avoid a flash)
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    secureStorage.getItem(STORAGE_KEY).then((v) => setDismissed(v === '1'))
  }, [])

  if (COMING_SOON_GAMES.length === 0 || dismissed !== false) return null

  const names = COMING_SOON_GAMES.map((g) => g.label)
  const label =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0]

  function close() {
    setDismissed(true)
    secureStorage.setItem(STORAGE_KEY, '1')
  }

  return (
    <View
      className={`flex-row items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 ${className}`}
    >
      <Ionicons name="rocket-outline" size={14} color={colors.primary} />
      <Text className="text-muted text-xs font-display flex-1" numberOfLines={1}>
        <Text className="text-ink font-display-semibold">{label}</Text> coming soon
      </Text>
      <View className="bg-primary/10 border border-primary/40 rounded px-1.5 py-0.5">
        <Text className="text-primary font-mono-bold text-[9px] tracking-wider">SOON</Text>
      </View>
      <Pressable onPress={close} hitSlop={8} className="active:opacity-60 ml-0.5">
        <Ionicons name="close" size={15} color={colors.muted2} />
      </Pressable>
    </View>
  )
}
