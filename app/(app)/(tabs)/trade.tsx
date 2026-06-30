import { useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMyProfile } from '@/lib/profile'
import { useMyWantlist } from '@/lib/wantlist'
import { useMyPublicCards } from '@/lib/binders'
import { useMatches } from '@/lib/matches'
import type { Game } from '@/types'
import { Chip } from '@/components/ui'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { DistanceTag } from '@/components/ui/DistanceTag'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { GetOnRadar } from '@/components/GetOnRadar'
import { ListedForTradeList } from '@/components/trade/ListedForTradeList'
import { WishlistList } from '@/components/trade/WishlistList'
import { colors } from '@/lib/theme'

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const
const GAME_OPTIONS: { label: string; value: Game | null }[] = [
  { label: 'All', value: null },
  { label: 'Gundam', value: 'gundam' },
  { label: 'One Piece', value: 'one_piece' },
]

type Segment = 'listed' | 'wishlist'

export default function TradeScreen() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useMyProfile()
  const { cardIds: wantedIds } = useMyWantlist()
  const { cards: myPublicCards } = useMyPublicCards()

  const [segment, setSegment] = useState<Segment>('listed')
  const [radiusKm, setRadiusKm] = useState(25)
  const [game, setGame] = useState<Game | null>(null)
  const [search, setSearch] = useState('')

  const lat = profile?.lat ?? null
  const lng = profile?.lng ?? null
  const noLocation = !profileLoading && !profile?.lat

  const { matches } = useMatches(lat, lng, radiusKm)

  const hasLocation = !!profile?.lat
  const hasTradeCards = myPublicCards.length > 0
  const hasWantlist = wantedIds.size > 0
  const setupComplete = hasLocation && hasTradeCards && hasWantlist

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScreenHeader
        title="Trade"
        subtitle={segment === 'listed' ? 'Cards near you to trade' : "Who's hunting cards nearby"}
        right={<DistanceTag km={radiusKm} />}
      />

      {!setupComplete && (
        <GetOnRadar hasLocation={hasLocation} hasTradeCards={hasTradeCards} hasWantlist={hasWantlist} />
      )}

      {/* Matches entry */}
      {matches.length > 0 && (
        <Pressable
          onPress={() => router.push('/(app)/matches')}
          className="mx-5 mb-1 flex-row items-center bg-primary/10 border border-primary-soft rounded-2xl px-4 py-3 active:opacity-80"
        >
          <RadarLogo size={26} />
          <View className="flex-1 ml-3">
            <Text className="text-ink font-display-semibold text-sm">
              {matches.length} match{matches.length !== 1 ? 'es' : ''} near you
            </Text>
            <Text className="text-muted text-xs font-display">Traders you can trade with now</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      )}

      {/* Segmented control */}
      <View className="mx-5 flex-row bg-surface border border-subtle rounded-xl p-0.5">
        {([
          { key: 'listed', label: 'Listed for Trade' },
          { key: 'wishlist', label: 'Wantlist' },
        ] as const).map((s) => {
          const active = segment === s.key
          return (
            <Pressable
              key={s.key}
              onPress={() => setSegment(s.key)}
              className={`flex-1 items-center py-2 rounded-[10px] ${active ? 'bg-primary/10' : ''}`}
            >
              <Text className={`text-sm font-display-semibold ${active ? 'text-primary' : 'text-muted-2'}`}>{s.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {/* Search */}
      <View className="px-5 pt-3">
        <View className="flex-row items-center bg-surface rounded-xl px-3.5 border border-subtle">
          <Ionicons name="search" size={16} color={colors.primary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={segment === 'listed' ? 'Search cards…' : 'Search wanted cards…'}
            placeholderTextColor={colors.faint2}
            className="flex-1 text-ink py-2.5 ml-2 text-sm font-display"
          />
        </View>
      </View>

      {/* Game filter */}
      <View className="flex-row px-5 pt-3 gap-2">
        {GAME_OPTIONS.map((opt) => (
          <Chip key={String(opt.value)} label={opt.label} active={game === opt.value} onPress={() => setGame(opt.value)} />
        ))}
      </View>

      {/* Radius chips */}
      <View className="flex-row px-5 pt-2 pb-3 gap-2">
        {RADIUS_OPTIONS.map((r) => (
          <Chip key={r} label={r === radiusKm ? `${r} km` : String(r)} active={radiusKm === r} onPress={() => setRadiusKm(r)} mono />
        ))}
      </View>

      {noLocation && (
        <View className="mx-5 mb-2 bg-amber/10 border border-amber/35 rounded-xl px-4 py-3">
          <Text className="text-amber text-xs font-display">
            Set your location in Profile to see local traders. Showing shippers only.
          </Text>
        </View>
      )}

      {segment === 'listed' ? (
        <ListedForTradeList lat={lat} lng={lng} radiusKm={radiusKm} game={game} search={search} wantedIds={wantedIds} />
      ) : (
        <WishlistList lat={lat} lng={lng} radiusKm={radiusKm} game={game} search={search} />
      )}
    </SafeAreaView>
  )
}
