import { View, Text, Pressable } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { MonoLabel } from '@/components/ui'
import { colors } from '@/lib/theme'

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

/** First-run "Get on the radar" checklist — shown until the user has listed cards + a wantlist. */
export function GetOnRadar({ hasLocation, hasTradeCards, hasWantlist }: Props) {
  const router = useRouter()
  const done = [hasLocation, hasTradeCards, hasWantlist].filter(Boolean).length

  return (
    <View className="mx-5 mb-3 bg-surface border border-subtle rounded-2xl p-5">
      <View className="flex-row items-center">
        <RadarLogo size={40} animated />
        <View className="ml-3 flex-1">
          <Text className="text-ink font-display-bold text-base">Get on the radar</Text>
          <Text className="text-muted text-xs mt-0.5 font-display">A couple steps and you'll see trades near you.</Text>
        </View>
      </View>

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
