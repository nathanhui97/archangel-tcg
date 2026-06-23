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
import * as Location from 'expo-location'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Game } from '@/types'
import { GAME_LABELS } from '@/types'

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,20}$/
const ALL_GAMES: Game[] = ['gundam', 'one_piece']

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function ProfileSetupScreen() {
  const { session, refreshProfile, signOut } = useAuth()
  const [handle, setHandle] = useState('')
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle')

  const [games, setGames] = useState<Game[]>(['gundam'])

  const [locStatus, setLocStatus] = useState<'none' | 'capturing' | 'set' | 'denied'>('none')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleGame(g: Game) {
    setError(null)
    setGames((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )
  }

  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    const { data, error: sbError } = await supabase.rpc('is_handle_available', {
      p_handle: value,
    })
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
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      })
      // Round to 2 decimals (~1.1 km grid) — privacy by design.
      const roundedLat = Math.round(pos.coords.latitude * 100) / 100
      const roundedLng = Math.round(pos.coords.longitude * 100) / 100
      setLat(roundedLat)
      setLng(roundedLng)
      setLocStatus('set')
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
    })

    setSaving(false)

    if (sbError) {
      // Race: someone may have grabbed the handle between check and insert.
      if (sbError.code === '23505') {
        setHandleStatus('taken')
        setError('That handle was just taken. Try another.')
      } else {
        setError(sbError.message)
      }
      return
    }

    await refreshProfile()
    // Auth gate in root layout will move us to /(app) automatically.
  }

  function handleHint() {
    switch (handleStatus) {
      case 'checking':
        return <Text className="text-gray-500 text-xs mt-2">Checking…</Text>
      case 'available':
        return <Text className="text-emerald-400 text-xs mt-2">Handle is available</Text>
      case 'taken':
        return <Text className="text-red-400 text-xs mt-2">Handle is taken</Text>
      case 'invalid':
        return (
          <Text className="text-gray-500 text-xs mt-2">
            3–20 characters, letters/numbers/underscore only
          </Text>
        )
      default:
        return (
          <Text className="text-gray-500 text-xs mt-2">
            Other players see this. 3–20 chars.
          </Text>
        )
    }
  }

  function locationButton() {
    if (locStatus === 'capturing') {
      return (
        <View className="bg-gray-800 py-4 rounded-2xl items-center flex-row justify-center">
          <ActivityIndicator color="#cbd5e1" />
          <Text className="text-gray-300 ml-2">Getting your area…</Text>
        </View>
      )
    }
    if (locStatus === 'set') {
      return (
        <View className="bg-gray-900 border border-emerald-700/40 px-4 py-4 rounded-2xl">
          <Text className="text-emerald-300 font-medium">Location set</Text>
          <Text className="text-gray-500 text-xs mt-1">
            Stored as an approximate area (~1 km grid). We never store your exact GPS.
          </Text>
          <Pressable
            onPress={captureLocation}
            className="mt-3 active:opacity-60"
          >
            <Text className="text-indigo-400 text-sm">Update</Text>
          </Pressable>
        </View>
      )
    }
    if (locStatus === 'denied') {
      return (
        <View className="bg-gray-900 border border-red-900/40 px-4 py-4 rounded-2xl">
          <Text className="text-red-300 font-medium">Location denied</Text>
          <Text className="text-gray-500 text-xs mt-1">
            Enable location in Settings to use matching. We only store an approximate area.
          </Text>
          <Pressable onPress={captureLocation} className="mt-3 active:opacity-60">
            <Text className="text-indigo-400 text-sm">Try again</Text>
          </Pressable>
        </View>
      )
    }
    return (
      <Pressable
        onPress={captureLocation}
        className="bg-gray-800 active:opacity-80 py-4 rounded-2xl items-center"
      >
        <Text className="text-white font-medium">Use my approximate location</Text>
      </Pressable>
    )
  }

  const canSave =
    handleStatus === 'available' &&
    games.length > 0 &&
    lat !== null &&
    lng !== null &&
    !saving

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-12">
          <Text className="text-3xl font-bold text-white">Set up your profile</Text>
          <Text className="text-gray-400 mt-2">
            Pick a handle and your area so we can find Gundam trades near you.
          </Text>

          <View className="mt-10">
            <Text className="text-gray-300 text-sm mb-2 font-medium">Handle</Text>
            <TextInput
              value={handle}
              onChangeText={onChangeHandle}
              placeholder="e.g. cosmic_era"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              editable={!saving}
              className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800 text-base"
            />
            {handleHint()}
          </View>

          <View className="mt-8">
            <Text className="text-gray-300 text-sm mb-2 font-medium">Games you play</Text>
            <Text className="text-gray-500 text-xs mb-3">
              Pick at least one. Matches are per-game — you only see trades for games you play.
            </Text>
            <View className="flex-row gap-2">
              {ALL_GAMES.map((g) => {
                const selected = games.includes(g)
                return (
                  <Pressable
                    key={g}
                    onPress={() => toggleGame(g)}
                    className={`flex-1 py-3 rounded-xl border items-center active:opacity-80 ${
                      selected
                        ? 'bg-indigo-600 border-indigo-500'
                        : 'bg-gray-900 border-gray-800'
                    }`}
                  >
                    <Text
                      className={`font-semibold text-sm ${
                        selected ? 'text-white' : 'text-gray-300'
                      }`}
                    >
                      {GAME_LABELS[g]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View className="mt-8">
            <Text className="text-gray-300 text-sm mb-2 font-medium">Approximate location</Text>
            {locationButton()}
          </View>

          {error && (
            <Text className="text-red-400 text-sm mt-4 text-center">{error}</Text>
          )}

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            className={`mt-8 py-4 rounded-2xl items-center ${
              canSave ? 'bg-indigo-600 active:opacity-80' : 'bg-gray-800'
            }`}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-base">Continue</Text>
            )}
          </Pressable>

          <Pressable
            onPress={signOut}
            className="mt-6 items-center active:opacity-60"
          >
            <Text className="text-gray-500 text-sm">Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
