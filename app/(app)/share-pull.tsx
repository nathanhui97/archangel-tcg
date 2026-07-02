import { useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Image, Alert, ActivityIndicator } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useCard } from '@/lib/cards'
import { useMyProfile } from '@/lib/profile'
import { createPull } from '@/lib/pulls'
import { CardThumb } from '@/components/ui'
import { colors } from '@/lib/theme'
import type { PullVisibility } from '@/types'

export default function SharePullScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { cardId, binderItemId } = useLocalSearchParams<{ cardId: string; binderItemId?: string }>()
  const { card } = useCard(cardId)
  const { profile } = useMyProfile()

  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [isPull, setIsPull] = useState(true)
  const [visibility, setVisibility] = useState<PullVisibility>('public')
  const [posting, setPosting] = useState(false)

  const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Enable camera access to snap your card.')
      return
    }
    // Camera only (no gallery) — a live shot is what makes a pull verifiable.
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 })
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri)
  }

  async function post() {
    if (!profile?.id || !cardId) return
    setPosting(true)
    try {
      await createPull({
        userId: profile.id,
        cardId,
        binderItemId: binderItemId ?? null,
        photoUri,
        caption,
        isPull,
        visibility,
      })
      Alert.alert('Posted 🎉', 'Your pull is live — it’ll show up in the feed.', [
        { text: 'Nice', onPress: () => router.back() },
      ])
    } catch (err) {
      Alert.alert('Could not post', (err as Error).message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: 'Share your pull' }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {/* Card */}
        <View className="flex-row items-center">
          <CardThumb uri={card?.image_url} className="w-16 h-[88px]" radius="rounded-lg" />
          <View className="flex-1 ml-3.5">
            <Text className="text-ink font-display-semibold text-base" numberOfLines={2}>{card?.name ?? '…'}</Text>
            <Text className="text-muted font-mono text-xs mt-0.5">{cardId}</Text>
            {card?.is_alt_art && (
              <View className="flex-row items-center gap-0.5 bg-primary rounded px-1.5 py-0.5 mt-1.5 self-start">
                <Ionicons name="sparkles" size={8} color={colors.primaryInk} />
                <Text className="text-primary-ink font-mono-bold text-[9px] tracking-wider">ALT</Text>
              </View>
            )}
          </View>
        </View>

        {/* Photo — optional, and only ever used to verify (never posted) */}
        <View className="flex-row items-center justify-between mt-7">
          <Text className="text-ink font-display-semibold text-sm">Get verified ✓</Text>
          <Text className="text-faint text-xs font-display">Optional</Text>
        </View>
        <Text className="text-muted text-xs mt-1 font-display leading-4">
          Snap the real card so our team can confirm it’s yours. The photo is{' '}
          <Text className="text-ink font-display-medium">only for verification — it’s never posted or shown</Text>. Just
          the card appears on the feed, with a ✓ once approved.
        </Text>

        {photoUri ? (
          <View className="mt-3">
            <View className="rounded-2xl overflow-hidden border border-primary/40">
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: 260 }} resizeMode="cover" />
              <View className="absolute top-2 left-2 flex-row items-center gap-1 bg-bg/80 rounded-lg px-2 py-1">
                <Ionicons name="lock-closed" size={11} color={colors.muted2} />
                <Text className="text-muted-2 text-[10px] font-display-medium">Private</Text>
              </View>
              <Pressable
                onPress={takePhoto}
                className="absolute top-2 right-2 flex-row items-center gap-1 bg-bg/80 rounded-lg px-2.5 py-1.5 active:opacity-70"
              >
                <Ionicons name="camera-reverse-outline" size={14} color={colors.ink} />
                <Text className="text-ink text-xs font-display-medium">Retake</Text>
              </Pressable>
            </View>
            <View className="flex-row items-center gap-1.5 mt-2">
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text className="text-primary text-xs font-display-medium">
                We’ll review this to verify — it stays private.
              </Text>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={takePhoto}
            className="items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-8 mt-3 active:opacity-70"
          >
            <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mb-2">
              <Ionicons name="camera" size={24} color={colors.primary} />
            </View>
            <Text className="text-primary font-display-semibold text-sm">Add a verification photo</Text>
            <Text className="text-faint text-xs mt-1 font-display px-8 text-center">
              Tip: include a slip with @{profile?.handle ?? 'you'} · {today}
            </Text>
          </Pressable>
        )}

        {/* Caption */}
        <Text className="text-ink font-display-semibold text-sm mt-6 mb-2.5">Say something (optional)</Text>
        <View className="bg-surface rounded-xl px-3.5 border border-subtle">
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Finally pulled this…"
            placeholderTextColor={colors.faint2}
            multiline
            maxLength={280}
            className="text-ink py-3 text-sm font-display min-h-[52px]"
          />
        </View>

        {/* Fresh pull toggle */}
        <Pressable
          onPress={() => setIsPull((v) => !v)}
          className="flex-row items-center justify-between mt-6 bg-surface border border-subtle rounded-xl px-4 py-3.5 active:opacity-80"
        >
          <View className="flex-1 pr-3">
            <Text className="text-ink font-display-medium text-sm">Fresh pull ✨</Text>
            <Text className="text-muted text-xs mt-0.5 font-display">Show it as just pulled, not an old card</Text>
          </View>
          <View className={`w-12 h-7 rounded-full p-0.5 ${isPull ? 'bg-primary' : 'bg-track'}`}>
            <View className={`w-6 h-6 rounded-full bg-bg ${isPull ? 'ml-auto' : ''}`} />
          </View>
        </Pressable>

        {/* Visibility */}
        <View className="flex-row mt-3 bg-surface border border-subtle rounded-xl p-0.5">
          {(['public', 'private'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setVisibility(v)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-[10px] ${visibility === v ? 'bg-primary/10' : ''}`}
            >
              <Ionicons
                name={v === 'public' ? 'earth' : 'lock-closed'}
                size={13}
                color={visibility === v ? colors.primary : colors.muted2}
              />
              <Text className={`text-sm font-display-semibold ${visibility === v ? 'text-primary' : 'text-muted-2'}`}>
                {v === 'public' ? 'Public' : 'Only me'}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Sticky Post */}
      <View
        className="absolute left-0 right-0 bottom-0 px-5 pt-3 bg-tabbar border-t border-subtle"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {!photoUri && (
          <Text className="text-faint text-[11px] font-display text-center mb-2">
            No photo? Still posts — just without a ✓ badge
          </Text>
        )}
        <Pressable
          onPress={post}
          disabled={posting || !profile?.id}
          style={!posting && profile?.id ? { shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } } : undefined}
          className={`flex-row items-center justify-center gap-1.5 py-4 rounded-2xl ${posting || !profile?.id ? 'bg-surface-control' : 'bg-primary active:opacity-90'}`}
        >
          {posting ? (
            <ActivityIndicator color={colors.primaryInk} />
          ) : (
            <>
              <Ionicons name={photoUri ? 'shield-checkmark' : 'arrow-up-circle-outline'} size={17} color={colors.primaryInk} />
              <Text className="text-primary-ink font-display-bold text-base">
                {photoUri ? 'Post & get verified' : 'Post to feed'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  )
}
