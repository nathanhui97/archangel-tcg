import { View, Text, Image, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '@/components/ui'
import { normRarity } from '@/lib/cards'
import { formatPrice } from '@/lib/prices'
import { colors } from '@/lib/theme'
import type { FeedPull } from '@/lib/pulls'
import type { ReactionKind } from '@/types'

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return `${Math.floor(d / 7)}w`
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

function ReactionPill({
  icon, label, count, active, onPress,
}: { icon: IoniconName; label?: string; count: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border active:opacity-70 ${
        active ? 'bg-primary/10 border-primary' : 'border-subtle'
      }`}
    >
      <Ionicons name={icon} size={15} color={active ? colors.primary : colors.muted2} />
      {label ? (
        <Text className={`text-xs font-display-semibold ${active ? 'text-primary' : 'text-muted-2'}`}>{label}</Text>
      ) : null}
      {count > 0 ? (
        <Text className={`text-xs font-mono-bold ${active ? 'text-primary' : 'text-muted-2'}`}>{count}</Text>
      ) : null}
    </Pressable>
  )
}

type Props = {
  pull: FeedPull
  mine: Set<ReactionKind>
  onReact: (kind: ReactionKind, on: boolean) => void
  onOpenTrader?: () => void
  onOpenCard?: () => void
}

/** One pull in the feed: owner, card art, value/rarity, caption, and reactions. */
export function PullCard({ pull, mine, onReact, onOpenTrader, onOpenCard }: Props) {
  const grade = pull.card_is_alt_art ? 'ALT' : normRarity(pull.card_rarity) || null
  const price = pull.card_market != null ? Number(pull.card_market) : null

  return (
    <View className="bg-surface border border-subtle rounded-2xl mx-4 mb-3.5 px-4 pt-3.5 pb-3">
      {/* Owner */}
      <Pressable onPress={onOpenTrader} className="flex-row items-center active:opacity-70">
        <Avatar handle={pull.owner_handle} size={34} />
        <View className="flex-1 ml-2.5">
          <View className="flex-row items-center gap-1">
            <Text className="text-ink font-mono-bold text-[13px]">@{pull.owner_handle}</Text>
            {pull.owner_verified_at ? <Ionicons name="checkmark-circle" size={13} color={colors.primary} /> : null}
          </View>
          <Text className="text-faint text-[11px] font-display">
            {pull.is_pull ? 'pulled a card' : 'added a card'} · {timeAgo(pull.created_at)}
          </Text>
        </View>
        {pull.verified_at ? (
          <View className="flex-row items-center gap-1 bg-primary/10 border border-primary/40 rounded-full px-2 py-0.5">
            <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
            <Text className="text-primary font-mono-bold text-[9px] tracking-wider">VERIFIED</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Card */}
      <Pressable onPress={onOpenCard} className="items-center mt-3.5 active:opacity-90">
        <View
          style={pull.card_is_alt_art ? { shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } } : undefined}
        >
          <View className="w-[132px] h-[185px] rounded-xl overflow-hidden border border-subtle bg-surface-raised">
            {pull.card_image_url ? (
              <Image source={{ uri: pull.card_image_url }} resizeMode="cover" className="w-full h-full" />
            ) : null}
          </View>
        </View>
      </Pressable>

      {/* Meta */}
      <View className="flex-row items-center justify-center gap-2 mt-3">
        <Text className="text-ink font-display-semibold text-sm" numberOfLines={1}>{pull.card_name}</Text>
        {grade ? (
          <View className="flex-row items-center gap-0.5 bg-primary/10 border border-primary/40 rounded px-1.5 py-0.5">
            {pull.card_is_alt_art ? <Ionicons name="sparkles" size={8} color={colors.primary} /> : null}
            <Text className="text-primary font-mono-bold text-[9px] tracking-wider">{grade}</Text>
          </View>
        ) : null}
      </View>
      {price != null ? (
        <Text className="text-faint text-xs font-mono text-center mt-1">≈ {formatPrice(price)} USD</Text>
      ) : null}

      {pull.caption ? (
        <Text className="text-muted text-sm font-display text-center mt-2 px-2">{pull.caption}</Text>
      ) : null}

      {/* Reactions */}
      <View className="flex-row items-center gap-2 mt-3.5">
        <ReactionPill
          icon="flame"
          count={pull.fire_count}
          active={mine.has('fire')}
          onPress={() => onReact('fire', !mine.has('fire'))}
        />
        <ReactionPill
          icon="heart"
          count={pull.heart_count}
          active={mine.has('heart')}
          onPress={() => onReact('heart', !mine.has('heart'))}
        />
        <View className="flex-1" />
        <ReactionPill
          icon="pricetag"
          label="Want"
          count={pull.want_count}
          active={mine.has('want')}
          onPress={() => onReact('want', !mine.has('want'))}
        />
      </View>
    </View>
  )
}
