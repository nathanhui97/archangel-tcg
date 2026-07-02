import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useCard, normRarity } from '@/lib/cards'
import { useCardPrice, formatPrice } from '@/lib/prices'
import { useMyProfile } from '@/lib/profile'
import { inquireAboutCard } from '@/lib/trades'
import { supabase } from '@/lib/supabase'
import { CardThumb, Avatar } from '@/components/ui'
import { colors } from '@/lib/theme'

/** A single card as seen inside someone's binder: express interest to that owner,
 *  or jump to the card page to see everyone who has it. */
export default function BinderCardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { cardId, ownerId, ownerHandle: ownerHandleParam } = useLocalSearchParams<{
    cardId: string
    ownerId: string
    ownerHandle?: string
  }>()
  const { card } = useCard(cardId)
  const { price } = useCardPrice(card?.tcgplayer_product_id)
  const { profile } = useMyProfile()
  const [ownerHandle, setOwnerHandle] = useState(ownerHandleParam ?? '')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (ownerHandleParam || !ownerId) return
    supabase
      .from('public_profiles')
      .select('handle')
      .eq('id', ownerId)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (data?.handle) setOwnerHandle(data.handle)
        },
        () => {}
      )
  }, [ownerId, ownerHandleParam])

  const isOwn = !!profile?.id && profile.id === ownerId
  const grade = card?.is_alt_art ? 'ALT' : normRarity(card?.rarity) || null

  async function showInterest() {
    if (!profile?.id || !ownerId || !cardId) return
    setSending(true)
    try {
      const tradeId = await inquireAboutCard(profile.id, ownerId, cardId, card?.name ?? cardId)
      router.replace({ pathname: '/(app)/chat/[id]', params: { id: tradeId } })
    } catch (err) {
      Alert.alert('Could not send', (err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: '' }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View className="items-center px-6 pt-2 pb-6">
          <View style={{ shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } }}>
            <CardThumb uri={card?.image_url} className="w-[150px] h-[210px]" radius="rounded-xl" />
          </View>
          <Text className="text-ink text-[22px] font-mono-bold mt-4">{cardId}</Text>
          <Text className="text-ink font-display-semibold text-base mt-1 text-center">{card?.name ?? ''}</Text>

          <View className="flex-row items-center gap-2 mt-2.5">
            {grade ? (
              <View className="flex-row items-center gap-0.5 bg-primary/10 border border-primary/40 rounded px-1.5 py-0.5">
                {card?.is_alt_art ? <Ionicons name="sparkles" size={9} color={colors.primary} /> : null}
                <Text className="text-primary font-mono-bold text-[10px] tracking-wider">{grade}</Text>
              </View>
            ) : null}
            {price ? (
              <Text className="text-faint text-xs font-mono">≈ {formatPrice(price.market)} USD</Text>
            ) : null}
          </View>

          {ownerHandle ? (
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/trader/[handle]', params: { handle: ownerHandle } })}
              className="flex-row items-center gap-1.5 mt-4 bg-surface border border-subtle rounded-full pl-1 pr-3.5 py-1 active:opacity-70"
            >
              <Avatar handle={ownerHandle} size={22} />
              <Text className="text-muted text-xs font-mono">in @{ownerHandle}’s binder</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* Actions */}
      <View
        className="absolute left-0 right-0 bottom-0 px-5 pt-3 bg-tabbar border-t border-subtle"
        style={{ paddingBottom: insets.bottom + 10 }}
      >
        {!isOwn && (
          <Pressable
            onPress={showInterest}
            disabled={sending || !profile?.id}
            style={!sending ? { shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } } : undefined}
            className={`flex-row items-center justify-center gap-1.5 py-4 rounded-2xl ${sending ? 'bg-surface-control' : 'bg-primary active:opacity-90'}`}
          >
            {sending ? (
              <ActivityIndicator color={colors.primaryInk} />
            ) : (
              <>
                <Ionicons name="hand-left" size={16} color={colors.primaryInk} />
                <Text className="text-primary-ink font-display-bold text-base">
                  Show interest{ownerHandle ? ` to @${ownerHandle}` : ''}
                </Text>
              </>
            )}
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push({ pathname: '/(app)/card/[id]', params: { id: cardId } })}
          className="flex-row items-center justify-center gap-1.5 py-3 mt-1 active:opacity-70"
        >
          <Text className="text-primary font-display-medium text-sm">See everyone who has this</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  )
}
