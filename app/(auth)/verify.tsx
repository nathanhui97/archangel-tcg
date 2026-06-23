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

const RESEND_COOLDOWN_SECONDS = 60

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
    const t = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    // Autofocus the code input on mount
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

    const { error: sbError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    setVerifying(false)

    if (sbError) {
      setError(sbError.message)
      return
    }
    // Auth listener in root layout will pick up the session and route us forward.
  }

  async function handleResend() {
    if (cooldown > 0 || !email) return
    setError(null)
    const { error: sbError } = await supabase.auth.signInWithOtp({ email })
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
    if (digits.length === 6) {
      handleVerify(digits)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 px-6 pt-12">
        <Text className="text-3xl font-bold text-white">Check your email</Text>
        <Text className="text-gray-400 mt-2">
          We sent a 6-digit code to{'\n'}
          <Text className="text-gray-200 font-medium">{email}</Text>
        </Text>

        <View className="mt-10">
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={onChangeCode}
            placeholder="000000"
            placeholderTextColor="#334155"
            keyboardType="number-pad"
            inputMode="numeric"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            editable={!verifying}
            className="bg-gray-900 text-white text-center tracking-[12px] text-3xl font-semibold px-4 py-5 rounded-xl border border-gray-800"
          />
          {error && (
            <Text className="text-red-400 text-sm mt-3 text-center">{error}</Text>
          )}
        </View>

        <Pressable
          onPress={() => handleVerify()}
          disabled={verifying || code.length !== 6}
          className={`mt-6 py-4 rounded-2xl items-center ${
            verifying || code.length !== 6
              ? 'bg-gray-800'
              : 'bg-indigo-600 active:opacity-80'
          }`}
        >
          {verifying ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">Verify</Text>
          )}
        </Pressable>

        <View className="mt-6 items-center">
          {cooldown > 0 ? (
            <Text className="text-gray-500 text-sm">
              Resend code in {cooldown}s
            </Text>
          ) : (
            <Pressable onPress={handleResend} className="active:opacity-60">
              <Text className="text-indigo-400 text-sm font-medium">
                Resend code
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => router.back()}
          className="mt-4 items-center active:opacity-60"
        >
          <Text className="text-gray-500 text-sm">Use a different email</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
