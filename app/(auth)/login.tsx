import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import {
  appleAuthAvailable,
  isExpoGo,
  signInWithApple,
  signInWithGoogle,
} from '@/lib/social-auth'
import { Button, MonoLabel } from '@/components/ui'
import { colors } from '@/lib/theme'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginScreen() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [socialBusy, setSocialBusy] = useState(false)
  const [appleReady, setAppleReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const isSignup = mode === 'signup'

  useEffect(() => {
    appleAuthAvailable().then(setAppleReady)
  }, [])

  function clearMessages() {
    if (error) setError(null)
    if (notice) setNotice(null)
  }

  async function handleSocial(fn: () => Promise<{ error?: string; cancelled?: boolean }>) {
    clearMessages()
    setSocialBusy(true)
    try {
      const { error: err, cancelled } = await fn()
      if (cancelled) return
      if (err) setError(err)
      // On success, AuthGate reacts to the new session and routes forward.
    } finally {
      setSocialBusy(false)
    }
  }

  async function handleSubmit() {
    const e = email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(e)) {
      setError("That doesn't look like a valid email.")
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (isSignup) {
        const { data, error: err } = await supabase.auth.signUp({ email: e, password })
        if (err) {
          setError(err.message)
          return
        }
        if (!data.session) {
          // Email confirmation is enabled → confirm with a 6-digit code in-app.
          router.push({ pathname: '/(auth)/verify', params: { email: e } })
          return
        }
        // Session present (confirmation off) → AuthGate routes to profile setup.
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: e, password })
        if (err) {
          setError(err.message)
          return
        }
        // Session set → AuthGate routes forward.
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 px-6 pt-10">
        <MonoLabel className="text-primary">{isSignup ? 'CREATE ACCOUNT' : 'SIGN IN'}</MonoLabel>
        <Text className="text-[28px] font-display-semibold text-ink mt-3">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </Text>
        <Text className="text-muted mt-2 font-display">
          {isSignup ? 'Pick an email and password to get started.' : 'Sign in with your email and password.'}
        </Text>

        {/* Email */}
        <View className="mt-9">
          <MonoLabel className="mb-2">EMAIL</MonoLabel>
          <View className="flex-row items-center bg-surface rounded-xl px-4 border border-subtle">
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t)
                clearMessages()
              }}
              placeholder="you@example.com"
              placeholderTextColor={colors.faint2}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              textContentType="emailAddress"
              editable={!busy}
              className="flex-1 text-ink py-4 ml-3 text-base font-mono"
            />
          </View>
        </View>

        {/* Password */}
        <View className="mt-5">
          <MonoLabel className="mb-2">PASSWORD</MonoLabel>
          <View className="flex-row items-center bg-surface rounded-xl px-4 border border-subtle">
            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
            <TextInput
              value={password}
              onChangeText={(t) => {
                setPassword(t)
                clearMessages()
              }}
              placeholder="••••••••"
              placeholderTextColor={colors.faint2}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showPw}
              textContentType={isSignup ? 'newPassword' : 'password'}
              editable={!busy}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
              className="flex-1 text-ink py-4 ml-3 text-base font-mono"
            />
            <Pressable onPress={() => setShowPw((s) => !s)} hitSlop={8} className="active:opacity-60">
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.faint2} />
            </Pressable>
          </View>
          {isSignup && <Text className="text-faint text-xs mt-2 font-display">At least 6 characters.</Text>}
        </View>

        {error && <Text className="text-danger text-sm mt-3 font-display">{error}</Text>}
        {notice && <Text className="text-primary text-sm mt-3 font-display">{notice}</Text>}

        <View className="mt-6">
          <Button
            title={isSignup ? 'Create account' : 'Sign in'}
            onPress={handleSubmit}
            loading={busy}
            disabled={email.length === 0 || password.length === 0}
          />
        </View>

        <Pressable
          onPress={() => {
            setMode(isSignup ? 'signin' : 'signup')
            setError(null)
            setNotice(null)
          }}
          className="mt-6 items-center active:opacity-60"
        >
          <Text className="text-muted text-sm font-display">
            {isSignup ? 'Already have an account? ' : 'New here? '}
            <Text className="text-primary font-display-medium">{isSignup ? 'Sign in' : 'Create an account'}</Text>
          </Text>
        </Pressable>

        {/* Social sign-in — native modules only exist in a dev/standalone build,
            so we hide this whole block in Expo Go. */}
        {!isExpoGo && (
          <View className="mt-9">
            <View className="flex-row items-center">
              <View className="flex-1 h-px bg-subtle" />
              <Text className="text-faint text-xs mx-3 font-mono">OR</Text>
              <View className="flex-1 h-px bg-subtle" />
            </View>

            {appleReady && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={12}
                style={{ height: 52, marginTop: 20 }}
                onPress={() => handleSocial(signInWithApple)}
              />
            )}

            <Pressable
              onPress={() => handleSocial(signInWithGoogle)}
              disabled={socialBusy}
              className="flex-row items-center justify-center bg-surface border border-subtle rounded-xl py-4 mt-4 active:opacity-70"
            >
              <Ionicons name="logo-google" size={18} color={colors.ink} />
              <Text className="text-ink font-display-medium ml-3 text-base">Continue with Google</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
