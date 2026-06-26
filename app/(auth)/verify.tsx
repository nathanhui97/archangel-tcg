import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { MonoLabel, Cursor } from '@/components/ui'
import { colors } from '@/lib/theme'

const RESEND_COOLDOWN_SECONDS = 60
const CELLS = [0, 1, 2, 3, 4, 5]

export default function VerifyScreen() {
  const router = useRouter()
  const { email: emailParam } = useLocalSearchParams<{ email: string }>()
  const email = (emailParam ?? '').toLowerCase()

  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250)
    return () => clearTimeout(t)
  }, [])

  async function handleVerify(submittedCode?: string) {
    const token = (submittedCode ?? code).replace(/\D/g, '')
    if (token.length !== 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    setError(null)
    setVerifying(true)

    const { error: sbError } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })

    setVerifying(false)
    if (sbError) {
      setError(sbError.message)
      return
    }
    // Auth listener in root layout will pick up the session and route forward.
  }

  async function handleResend() {
    if (cooldown > 0 || !email) return
    setError(null)
    const { error: sbError } = await supabase.auth.resend({ type: 'signup', email })
    if (sbError) {
      setError(sbError.message)
      return
    }
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  function onChangeCode(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (error) setError(null)
    if (digits.length === 6) handleVerify(digits)
  }

  const mm = Math.floor(cooldown / 60)
  const ss = String(cooldown % 60).padStart(2, '0')

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 px-6 pt-10">
        <MonoLabel className="text-primary">CONFIRM</MonoLabel>
        <Text className="text-[28px] font-display-semibold text-ink mt-3">Confirm your email</Text>
        <Text className="text-muted mt-2 font-display">
          Enter the 6-digit code sent to{'\n'}
          <Text className="text-primary font-mono">{email}</Text>
        </Text>

        {/* Code cells (single hidden input drives them) */}
        <Pressable onPress={() => inputRef.current?.focus()} className="mt-10">
          <View className="flex-row justify-between">
            {CELLS.map((i) => {
              const char = code[i]
              const isActive = i === code.length
              return (
                <View
                  key={i}
                  className={`w-[46px] h-[62px] rounded-xl bg-surface border items-center justify-center ${
                    isActive ? 'border-primary' : char ? 'border-subtle' : 'border-subtle'
                  }`}
                  style={isActive ? { shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } } : undefined}
                >
                  {char ? (
                    <Text
                      className="text-ink text-[28px] font-mono-medium"
                      style={{ textShadowColor: colors.primary, textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } }}
                    >
                      {char}
                    </Text>
                  ) : isActive ? (
                    <Cursor height={28} />
                  ) : null}
                </View>
              )
            })}
          </View>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={onChangeCode}
            keyboardType="number-pad"
            inputMode="numeric"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            editable={!verifying}
            className="absolute opacity-0 w-full h-[62px]"
          />
        </Pressable>

        {error && <Text className="text-danger text-sm mt-4 text-center font-display">{error}</Text>}

        <View className="mt-8 flex-row items-center justify-center gap-2">
          {verifying && <ActivityIndicator size="small" color={colors.primary} />}
          {cooldown > 0 ? (
            <Text className="text-muted text-sm font-display">
              Resend code in <Text className="font-mono text-dim">{mm}:{ss}</Text>
            </Text>
          ) : (
            <Pressable onPress={handleResend} className="active:opacity-60">
              <Text className="text-primary text-sm font-display-medium">Resend code</Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => router.back()} className="mt-4 items-center active:opacity-60">
          <Text className="text-primary text-sm font-display-medium">Use a different email</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
