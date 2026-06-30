import { useEffect, useState } from 'react'
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { MonoLabel } from '@/components/ui'
import { secureStorage } from '@/lib/secure-storage'
import { colors } from '@/lib/theme'

// Enable smooth expand/collapse on Android (no-op on iOS).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const STORAGE_KEY = 'getOnRadar.expanded'

type Props = {
  hasLocation: boolean
  hasTradeCards: boolean
  hasWantlist: boolean
}

function ChecklistRow({
  done, index, title, subtitle, action,
}: { done: boolean; index: number; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <View className="flex-row items-center py-3 border-b border-hair">
      {done ? (
        <View className="w-7 h-7 rounded-full bg-primary items-center justify-center">
          <Ionicons name="checkmark" size={16} color={colors.primaryInk} />
        </View>
      ) : (
        <View className="w-7 h-7 rounded-full border border-subtle items-center justify-center">
          <Text className="text-muted-2 font-mono-bold text-xs">{index}</Text>
        </View>
      )}
      <View className="flex-1 ml-3">
        <Text className={`font-display-semibold text-sm ${done ? 'text-muted' : 'text-ink'}`}>{title}</Text>
        <Text className="text-muted text-xs mt-0.5 font-display">{subtitle}</Text>
      </View>
      {done ? <Text className="text-primary text-xs font-display-medium">Done</Text> : action}
    </View>
  )
}

function AddBtn({ href, filled }: { href: any; filled?: boolean }) {
  return (
    <Link href={href} asChild>
      <Pressable className={`rounded-lg px-3.5 py-1.5 active:opacity-70 ${filled ? 'bg-primary' : 'border border-primary'}`}>
        <Text className={`font-display-semibold text-sm ${filled ? 'text-primary-ink' : 'text-primary'}`}>Add</Text>
      </Pressable>
    </Link>
  )
}

/**
 * First-run "Get on the radar" checklist. Collapsed to a slim bar by default so
 * it doesn't dominate the Trade tab before setup is done; tap to expand the full
 * checklist. The expanded/collapsed choice is remembered across launches.
 * The parent unmounts this entirely once all three steps are complete.
 */
export function GetOnRadar({ hasLocation, hasTradeCards, hasWantlist }: Props) {
  const router = useRouter()
  const done = [hasLocation, hasTradeCards, hasWantlist].filter(Boolean).length
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    secureStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === '1') setExpanded(true)
    })
  }, [])

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((prev) => {
      const next = !prev
      secureStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  // Collapsed — slim one-line bar with progress.
  if (!expanded) {
    return (
      <Pressable
        onPress={toggle}
        className="mx-5 mb-3 flex-row items-center bg-surface border border-subtle rounded-2xl px-4 py-3 active:opacity-80"
      >
        <RadarLogo size={22} />
        <Text className="flex-1 ml-3 text-ink font-display-semibold text-sm">Finish getting on the radar</Text>
        <View className="bg-primary/10 border border-primary-soft rounded-full px-2.5 py-1 mr-2">
          <Text className="text-primary font-mono-bold text-[11px]">{done} of 3</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.muted2} />
      </Pressable>
    )
  }

  // Expanded — full checklist.
  return (
    <View className="mx-5 mb-3 bg-surface border border-subtle rounded-2xl p-5">
      <Pressable onPress={toggle} className="flex-row items-center active:opacity-80">
        <RadarLogo size={40} animated />
        <View className="ml-3 flex-1">
          <Text className="text-ink font-display-bold text-base">Get on the radar</Text>
          <Text className="text-muted text-xs mt-0.5 font-display">A couple steps and you'll see trades near you.</Text>
        </View>
        <Ionicons name="chevron-up" size={18} color={colors.muted2} />
      </Pressable>

      {/* Progress */}
      <View className="flex-row items-center justify-between mt-4 mb-1">
        <MonoLabel>{done} OF 3 DONE</MonoLabel>
      </View>
      <View className="h-1.5 rounded-full bg-track overflow-hidden">
        <View className="h-full bg-primary rounded-full" style={{ width: `${(done / 3) * 100}%` }} />
      </View>

      {/* Checklist */}
      <View className="mt-2">
        <ChecklistRow
          done={hasLocation}
          index={1}
          title="Set your area"
          subtitle="So we can find trades near you"
          action={
            <Pressable onPress={() => router.push('/(app)/(tabs)/profile')} className="rounded-lg px-3.5 py-1.5 border border-primary active:opacity-70">
              <Text className="text-primary font-display-semibold text-sm">Set</Text>
            </Pressable>
          }
        />
        <ChecklistRow
          done={hasTradeCards}
          index={2}
          title="Add cards for trade"
          subtitle="So nearby players can find you"
          action={<AddBtn href="/(app)/binders/new" filled />}
        />
        <ChecklistRow
          done={hasWantlist}
          index={3}
          title="Add to your wantlist"
          subtitle="Tell us what you're hunting"
          action={<AddBtn href="/(app)/wantlist/add" />}
        />
      </View>
    </View>
  )
}
