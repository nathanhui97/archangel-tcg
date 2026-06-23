import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("That doesn't look like a valid email.")
      return
    }
    setError(null)
    setSending(true)

    const { error: sbError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true, // first-time users get an account
      },
    })

    setSending(false)

    if (sbError) {
      setError(sbError.message)
      return
    }

    router.push({ pathname: '/(auth)/verify', params: { email: trimmed } })
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 px-6 pt-12">
        <Text className="text-3xl font-bold text-white">Sign in</Text>
        <Text className="text-gray-400 mt-2">
          We&apos;ll email you a 6-digit code.
        </Text>

        <View className="mt-10">
          <Text className="text-gray-300 text-sm mb-2 font-medium">Email</Text>
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t)
              if (error) setError(null)
            }}
            placeholder="you@example.com"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!sending}
            className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800 text-base"
          />
          {error && (
            <Text className="text-red-400 text-sm mt-2">{error}</Text>
          )}
        </View>

        <Pressable
          onPress={handleSend}
          disabled={sending || email.length === 0}
          className={`mt-6 py-4 rounded-2xl items-center ${
            sending || email.length === 0
              ? 'bg-gray-800'
              : 'bg-indigo-600 active:opacity-80'
          }`}
        >
          {sending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">Send code</Text>
          )}
        </Pressable>

        <Text className="text-gray-500 text-xs mt-4 text-center">
          By continuing you agree we&apos;ll send a one-time code to this email.
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}
