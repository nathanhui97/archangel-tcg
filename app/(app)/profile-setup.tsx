import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Game } from '@/types'
import { GAME_LABELS } from '@/types'
import { GAMES } from '@/lib/games'
import { Button, MonoLabel } from '@/components/ui'
import { colors } from '@/lib/theme'

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,20}$/

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function ProfileSetupScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session, refreshProfile, signOut } = useAuth()
  const [handle, setHandle] = useState('')
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle')

  const [games, setGames] = useState<Game[]>(['gundam'])

  const [locStatus, setLocStatus] = useState<'none' | 'capturing' | 'set' | 'denied'>('none')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [city, setCity] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleGame(g: Game) {
    setError(null)
    setGames((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Seed a handle suggestion from the Google/email name so most users can just
  // tap through. Sanitised to the handle rules; runs once, and never overwrites
  // anything the user has typed.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || !session || handle) return
    const meta = (session.user.user_metadata ?? {}) as Record<string, string>
    const raw =
      meta.full_name || meta.name || meta.preferred_username || session.user.email?.split('@')[0] || ''
    const suggestion = raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
    if (suggestion.length >= 3) {
      prefilled.current = true
      setHandle(suggestion)
      setHandleStatus('checking')
      checkAvailability(suggestion)
    }
  }, [session, handle])

  function onChangeHandle(text: string) {
    const cleaned = text.replace(/\s/g, '')
    setHandle(cleaned)
    setError(null)

    if (!cleaned) {
      setHandleStatus('idle')
      return
    }
    if (!HANDLE_REGEX.test(cleaned)) {
      setHandleStatus('invalid')
      return
    }

    setHandleStatus('checking')
    if (checkTimer.current) clearTimeout(checkTimer.current)
    checkTimer.current = setTimeout(() => checkAvailability(cleaned), 400)
  }

  async function checkAvailability(value: string) {
    const { data, error: sbError } = await supabase.rpc('is_handle_available', { p_handle: value })
    if (sbError) {
      setHandleStatus('idle')
      return
    }
    setHandleStatus(data ? 'available' : 'taken')
  }

  async function captureLocation() {
    setLocStatus('capturing')
    setError(null)

    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      setLocStatus('denied')
      return
    }

    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
      // Round to 2 decimals (~1.1 km grid) — privacy by design.
      setLat(Math.round(pos.coords.latitude * 100) / 100)
      setLng(Math.round(pos.coords.longitude * 100) / 100)
      setLocStatus('set')

      // Best-effort city label for display (device geocoder, no API key).
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        const cityName = place?.city || place?.subregion || place?.district || null
        const label = [cityName, place?.region].filter(Boolean).join(', ')
        setCity(label || null)
      } catch {
        // City is optional — fall back to "area set" silently.
      }
    } catch {
      setError('Could not read your location. Try again.')
      setLocStatus('none')
    }
  }

  async function handleSave() {
    if (!session) return
    if (!HANDLE_REGEX.test(handle)) {
      setError('Pick a handle with 3–20 letters, numbers, or underscores.')
      return
    }
    if (handleStatus !== 'available') {
      setError('That handle is taken or unavailable.')
      return
    }
    if (games.length === 0) {
      setError('Pick at least one game you play.')
      return
    }
    if (lat === null || lng === null) {
      setError('Set your approximate location so we can find players near you.')
      return
    }

    setSaving(true)
    setError(null)

    const { error: sbError } = await supabase.from('profiles').insert({
      id: session.user.id,
      handle,
      games,
      lat,
      lng,
      city,
    })

    setSaving(false)

    if (sbError) {
      if (sbError.code === '23505') {
        // Unique violation — either the handle is taken by someone else, or we
        // already created our own profile (e.g. a double-submit). Check which.
        const { data: mine } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle()
        if (mine) {
          await refreshProfile()
          router.replace('/(app)/onboarding')
          return
        }
        setHandleStatus('taken')
        setError('That handle was just taken. Try another.')
      } else {
        setError(sbError.message)
      }
      return
    }

    await refreshProfile()
    router.replace('/(app)/onboarding')
  }

  function handleHint() {
    switch (handleStatus) {
      case 'checking':
        return <Text className="text-faint text-xs mt-2 font-display">Checking…</Text>
      case 'taken':
        return <Text className="text-danger text-xs mt-2 font-display">Handle is taken</Text>
      case 'invalid':
      default:
        return (
          <Text className="text-faint text-xs mt-2 font-display">
            3–20 characters · letters, numbers, _
          </Text>
        )
    }
  }

  const canSave =
    handleStatus === 'available' && games.length > 0 && lat !== null && lng !== null && !saving

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-12">
          <Text className="text-[23px] font-display-semibold text-ink">Set up your profile</Text>
          <Text className="text-muted mt-2 font-display">Just three things to get on the radar.</Text>

          {/* Handle */}
          <View className="mt-9">
            <MonoLabel className="mb-2">HANDLE</MonoLabel>
            <View className="flex-row items-center bg-surface rounded-xl px-4 border border-subtle">
              <Text className="text-primary text-base font-mono-medium">@</Text>
              <TextInput
                value={handle}
                onChangeText={onChangeHandle}
                placeholder="ryze"
                placeholderTextColor={colors.faint2}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                editable={!saving}
                className="flex-1 text-ink py-4 ml-1 text-base font-mono"
              />
              {handleStatus === 'available' && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text className="text-primary text-xs font-display-medium">Available</Text>
                </View>
              )}
            </View>
            {handleHint()}
          </View>

          {/* Games */}
          <View className="mt-7">
            <MonoLabel className="mb-3">GAMES YOU PLAY</MonoLabel>
            <View className="flex-row flex-wrap gap-2">
              {GAMES.map((gi) => {
                const isLive = gi.status === 'live'
                const selected = isLive && games.includes(gi.key as Game)
                return (
                  <Pressable
                    key={gi.key}
                    disabled={!isLive}
                    onPress={isLive ? () => toggleGame(gi.key as Game) : undefined}
                    className={`flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl border ${
                      !isLive
                        ? 'bg-surface border-subtle opacity-50'
                        : selected
                          ? 'bg-primary/10 border-primary active:opacity-80'
                          : 'bg-surface border-subtle active:opacity-80'
                    }`}
                  >
                    {selected && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                    <Text className={`font-display-semibold text-sm ${selected ? 'text-primary' : 'text-muted-2'}`}>
                      {gi.label}
                    </Text>
                    {!isLive && (
                      <View className="bg-primary/10 border border-primary/40 rounded px-1.5 py-0.5 ml-0.5">
                        <Text className="text-primary font-mono-bold text-[8px] tracking-wider">SOON</Text>
                      </View>
                    )}
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* Location / City */}
          <View className="mt-7">
            <MonoLabel className="mb-2">CITY</MonoLabel>
            <Pressable
              onPress={captureLocation}
              disabled={saving || locStatus === 'capturing'}
              className={`flex-row items-center rounded-xl px-4 py-4 border active:opacity-80 ${
                locStatus === 'set'
                  ? 'bg-primary/5 border-primary/40'
                  : locStatus === 'denied'
                    ? 'border-danger/35 bg-surface'
                    : 'border-subtle bg-surface'
              }`}
            >
              <Ionicons
                name={locStatus === 'set' ? 'location' : 'location-outline'}
                size={18}
                color={locStatus === 'set' ? colors.primary : colors.faint2}
              />
              <View className="flex-1 ml-3">
                {locStatus === 'set' ? (
                  <>
                    <Text className="text-base font-display-semibold text-ink">
                      {city ?? 'Your area is set'}
                    </Text>
                    <Text className="text-primary text-xs mt-0.5 font-display">
                      Located from your current position · tap to update
                    </Text>
                  </>
                ) : (
                  <Text className="text-base font-display text-faint-2">
                    {locStatus === 'capturing'
                      ? 'Getting your area…'
                      : locStatus === 'denied'
                        ? 'Location denied — tap to retry'
                        : 'Use my approximate location'}
                  </Text>
                )}
              </View>
              {locStatus === 'capturing' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : locStatus === 'set' ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.faint2} />
              )}
            </Pressable>
            <Text className="text-faint text-xs mt-2 font-display">
              Only your general area is shared with nearby traders — never a precise address.
            </Text>
          </View>

          {error && <Text className="text-danger text-sm mt-4 text-center font-display">{error}</Text>}

          <View className="mt-8">
            <Button title="Continue" onPress={handleSave} loading={saving} disabled={!canSave} />
          </View>

          <Pressable onPress={signOut} className="mt-6 items-center active:opacity-60">
            <Text className="text-faint text-sm font-display">Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
