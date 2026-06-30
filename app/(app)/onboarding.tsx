import { useRef, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { CardPicker } from '@/components/CardPicker'
import { useMyProfile } from '@/lib/profile'
import { addToWantlist, useMyWantlist } from '@/lib/wantlist'
import { createBinder, addCardsToBinder } from '@/lib/binders'
import { Button, MonoLabel } from '@/components/ui'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { colors } from '@/lib/theme'

// Steps: 0 welcome · 1 wishlist · 2 trade cards · 3 done.
// The two card steps are skippable; skipping advances to the next step (so a
// wishlist-skip still offers the trade step — best for seeding inventory).
type Step = 0 | 1 | 2 | 3

export default function OnboardingScreen() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)

  // Local tallies of what they've added, for the "done" recap.
  const [wishAdded, setWishAdded] = useState(0)
  const [tradeAdded, setTradeAdded] = useState(0)

  // The public "For Trade" binder is created lazily on the first trade-card add,
  // so a user who skips this step never leaves an empty binder behind.
  const tradeBinderId = useRef<string | null>(null)

  const { cardIds: wantedIds, refresh: refreshWant } = useMyWantlist()
  const { profile } = useMyProfile()
  // Open the picker on the game(s) they just chose: one game → that game,
  // multiple → "All". Falls back to All until the profile loads.
  const games = profile?.games ?? []
  const defaultGame = games.length === 1 ? games[0] : null

  function finish() {
    router.replace('/(app)/(tabs)/trade')
  }

  async function addWishlist(ids: string[]) {
    for (const id of ids) {
      try {
        await addToWantlist(id)
      } catch {
        /* duplicates already hidden via addedIds — ignore */
      }
    }
    await refreshWant()
    setWishAdded((n) => n + ids.length)
  }

  async function addTradeCards(ids: string[]) {
    if (!tradeBinderId.current) {
      const binder = await createBinder('For Trade', true, 'trade')
      tradeBinderId.current = binder.id
    }
    // Defaults to Near Mint, non-foil, qty 1 — users refine later.
    await addCardsToBinder(tradeBinderId.current, ids)
    setTradeAdded((n) => n + ids.length)
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      {step === 0 && (
        <WelcomeStep onStart={() => setStep(1)} onSkip={finish} />
      )}

      {step === 1 && (
        <CardStep stepIndex={0}>
          <CardPicker
            key={`wish-${defaultGame ?? 'all'}`}
            title="What cards are you hunting?"
            subtitle="Add a few — we'll ping you when one's nearby."
            addNoun="wishlist"
            addedIds={wantedIds}
            defaultGame={defaultGame}
            onSubmit={async (ids) => {
              if (ids.length) await addWishlist(ids)
              setStep(2)
            }}
            submitWithLabel={(n) => `Add ${n} & continue`}
            submitEmptyLabel="Skip for now"
          />
        </CardStep>
      )}

      {step === 2 && (
        <CardStep stepIndex={1}>
          <CardPicker
            key={`trade-${defaultGame ?? 'all'}`}
            title="What will you trade?"
            subtitle="These appear on nearby traders' radars."
            addNoun="trade binder"
            allowMultiple
            defaultGame={defaultGame}
            onSubmit={async (ids) => {
              if (ids.length) await addTradeCards(ids)
              setStep(3)
            }}
            submitWithLabel={(n) => `Add ${n} & continue`}
            submitEmptyLabel="Skip for now"
          />
        </CardStep>
      )}

      {step === 3 && (
        <DoneStep wishAdded={wishAdded} tradeAdded={tradeAdded} onFinish={finish} />
      )}
    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Step 0 — welcome / value
// ─────────────────────────────────────────────────────────────────────────

function WelcomeStep({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <View className="flex-1 px-7 pt-4">
      <View className="flex-1 items-center justify-center">
        <RadarLogo size={120} animated />
        <Text className="text-[26px] font-display-bold text-ink mt-10 text-center">
          Let's get you on the radar
        </Text>
        <Text className="text-muted text-base mt-3 text-center font-display leading-6">
          Add a few cards you want and a few you'll trade. The more you add, the
          faster nearby traders find you — and you find them.
        </Text>

        <View className="mt-9 w-full gap-3">
          <ValueRow icon="heart-outline" text="Your wishlist pings nearby sellers" />
          <ValueRow icon="albums-outline" text="Your trade cards appear on their radar" />
          <ValueRow icon="navigate-outline" text="Match and meet up to trade in person" />
        </View>
      </View>

      <View className="pb-6">
        <Button
          title="Add my cards"
          onPress={onStart}
          trailing={<Text className="text-primary-ink font-mono-bold text-base">→</Text>}
        />
        <Pressable onPress={onSkip} className="mt-5 items-center active:opacity-60">
          <Text className="text-faint text-sm font-display">I'll do this later</Text>
        </Pressable>
      </View>
    </View>
  )
}

function ValueRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View className="flex-row items-center bg-surface border border-subtle rounded-2xl px-4 py-3.5">
      <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text className="flex-1 text-ink font-display text-sm">{text}</Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Steps 1 & 2 — slim wizard chrome wrapping a CardPicker
// ─────────────────────────────────────────────────────────────────────────

function CardStep({ stepIndex, children }: { stepIndex: number; children: React.ReactNode }) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-1.5 px-5 pt-2 pb-1">
        {[0, 1].map((i) => (
          <View
            key={i}
            className={`h-1.5 rounded-full ${i <= stepIndex ? 'bg-primary w-6' : 'bg-track w-4'}`}
          />
        ))}
      </View>
      {children}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Step 3 — done / recap
// ─────────────────────────────────────────────────────────────────────────

function DoneStep({
  wishAdded,
  tradeAdded,
  onFinish,
}: {
  wishAdded: number
  tradeAdded: number
  onFinish: () => void
}) {
  const addedAnything = wishAdded > 0 || tradeAdded > 0
  return (
    <View className="flex-1 px-7 pt-4">
      <View className="flex-1 items-center justify-center">
        <RadarLogo size={120} animated />
        <Text className="text-[26px] font-display-bold text-ink mt-10 text-center">
          {addedAnything ? "You're on the radar" : 'All set'}
        </Text>
        <Text className="text-muted text-base mt-3 text-center font-display leading-6">
          {addedAnything
            ? "Nearby traders can find you now. We'll ping you when someone wants what you've got."
            : 'You can add cards any time from the Trade tab to start matching.'}
        </Text>

        {addedAnything && (
          <View className="flex-row gap-3 mt-9">
            <RecapTile count={tradeAdded} label="FOR TRADE" />
            <RecapTile count={wishAdded} label="ON WISHLIST" />
          </View>
        )}
      </View>

      <View className="pb-6">
        <Button
          title="Start trading"
          onPress={onFinish}
          trailing={<Text className="text-primary-ink font-mono-bold text-base">→</Text>}
        />
      </View>
    </View>
  )
}

function RecapTile({ count, label }: { count: number; label: string }) {
  return (
    <View className="bg-surface border border-subtle rounded-2xl px-7 py-5 items-center min-w-[120px]">
      <Text className="text-primary font-mono-bold text-3xl">{count}</Text>
      <MonoLabel className="mt-1">{label}</MonoLabel>
    </View>
  )
}
