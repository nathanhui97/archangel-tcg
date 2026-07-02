import { useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Image, Alert, ActivityIndicator } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useMyProfile } from '@/lib/profile'
import { submitBinderVerification } from '@/lib/verifications'
import { colors } from '@/lib/theme'

export default function VerifyBinderScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { binderId, binderName } = useLocalSearchParams<{ binderId: string; binderName?: string }>()
  const { profile } = useMyProfile()

  const [photos, setPhotos] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  async function addPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Enable camera access to photograph your binder.')
      return
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.6 })
    if (!res.canceled && res.assets[0]) setPhotos((p) => [...p, res.assets[0].uri])
  }

  async function submit() {
    if (!profile?.id || !binderId || photos.length === 0) return
    setSubmitting(true)
    try {
      await submitBinderVerification(profile.id, binderId, photos, note)
      Alert.alert('Sent for review 🕵️', 'We’ll verify it (and add any missing cards) within a day or two.', [
        { text: 'Done', onPress: () => router.back() },
      ])
    } catch (err) {
      Alert.alert('Could not submit', (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ headerShown: true, title: 'Verify binder' }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-start gap-2">
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-ink font-display-bold text-lg">Verify {binderName ?? 'this binder'}</Text>
            <Text className="text-muted text-sm mt-1 font-display leading-5">
              Snap your binder pages so we can confirm they’re real. We’ll add the ✓ badge — and fill in any cards you
              haven’t added yet.
            </Text>
          </View>
        </View>

        <View className="bg-surface border border-subtle rounded-2xl px-4 py-3.5 mt-5">
          <Text className="text-ink font-display-semibold text-sm mb-2">How it works</Text>
          {[
            'Photograph each page (a full page = many cards in one shot)',
            `Add a slip with @${profile?.handle ?? 'you'} · ${today} in one photo`,
            'Photos are private — only our team sees them, never posted',
            'Verified within a day or two',
          ].map((t, i) => (
            <View key={i} className="flex-row items-start gap-2 mt-1.5">
              <Ionicons name="checkmark-circle" size={13} color={colors.primary} style={{ marginTop: 2 }} />
              <Text className="text-muted text-xs font-display flex-1 leading-4">{t}</Text>
            </View>
          ))}
        </View>

        {/* Photos */}
        <Text className="text-ink font-display-semibold text-sm mt-6 mb-2.5">
          Photos {photos.length > 0 ? `· ${photos.length}` : ''}
        </Text>
        <View className="flex-row flex-wrap gap-2.5">
          {photos.map((uri, i) => (
            <View key={i} className="rounded-xl overflow-hidden border border-subtle" style={{ width: 96, height: 128 }}>
              <Image source={{ uri }} resizeMode="cover" className="w-full h-full" />
              <Pressable
                onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                hitSlop={6}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-bg/85 items-center justify-center active:opacity-70"
              >
                <Ionicons name="close" size={14} color={colors.ink} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={addPhoto}
            style={{ width: 96, height: 128 }}
            className="rounded-xl border border-dashed border-primary/40 bg-primary/5 items-center justify-center active:opacity-70"
          >
            <Ionicons name="camera" size={22} color={colors.primary} />
            <Text className="text-primary text-[11px] font-display-medium mt-1">Add page</Text>
          </Pressable>
        </View>

        {/* Note */}
        <Text className="text-ink font-display-semibold text-sm mt-6 mb-2.5">Note (optional)</Text>
        <View className="bg-surface rounded-xl px-3.5 border border-subtle">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. mostly Gundam, want to trade the rares"
            placeholderTextColor={colors.faint2}
            multiline
            maxLength={280}
            className="text-ink py-3 text-sm font-display min-h-[52px]"
          />
        </View>
      </ScrollView>

      <View
        className="absolute left-0 right-0 bottom-0 px-5 pt-3 bg-tabbar border-t border-subtle"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {photos.length === 0 && (
          <Text className="text-faint text-[11px] font-display text-center mb-2">Add at least one photo to submit</Text>
        )}
        <Pressable
          onPress={submit}
          disabled={submitting || photos.length === 0}
          style={!submitting && photos.length > 0 ? { shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } } : undefined}
          className={`flex-row items-center justify-center gap-1.5 py-4 rounded-2xl ${submitting || photos.length === 0 ? 'bg-surface-control' : 'bg-primary active:opacity-90'}`}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryInk} />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={17} color={photos.length > 0 ? colors.primaryInk : colors.faint} />
              <Text className={`font-display-bold text-base ${photos.length > 0 ? 'text-primary-ink' : 'text-faint'}`}>
                Submit for verification
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  )
}
