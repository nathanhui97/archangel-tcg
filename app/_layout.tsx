import { Stack, useRouter, useSegments, type Href } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProviderCompat } from '@/components/KeyboardCompat'
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono'
import { AuthProvider, useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'
import '../global.css'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, hasProfile } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  // Remember the last target we navigated to. The protected (app) tree contains
  // its own declarative <Redirect> (app/(app)/index.tsx) and re-renders on every
  // auth-state change, so without this guard the effect can fire router.replace
  // repeatedly for the same target while navigation is still settling — an
  // infinite update loop (e.g. right after deleting the account).
  const lastTarget = useRef<Href | null>(null)

  useEffect(() => {
    if (loading) return

    const seg = segments.join('/')
    const inAppGroup = segments[0] === '(app)'

    // Decide where (if anywhere) this auth state requires us to be.
    let target: Href | null = null
    if (!session) {
      // Not signed in — only redirect out of protected routes.
      if (inAppGroup) target = '/'
    } else if (hasProfile === null) {
      return // profile check still in flight; don't move yet
    } else if (hasProfile) {
      // Has profile — if they're on landing/auth, send them into the app.
      if (!inAppGroup) target = '/(app)'
    } else {
      // No profile yet — force profile-setup.
      if (seg !== '(app)/profile-setup') target = '/(app)/profile-setup'
    }

    if (target === null) {
      // We're where we should be — clear the guard so a future state can navigate.
      lastTarget.current = null
      return
    }
    // Fire each distinct target only once until it changes or clears.
    if (lastTarget.current !== target) {
      lastTarget.current = target
      router.replace(target)
    }
  }, [session, loading, hasProfile, segments, router])

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  })

  if (!fontsLoaded) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProviderCompat>
        <AuthProvider>
          <AuthGate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.ink,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </AuthGate>
        <StatusBar style="light" />
      </AuthProvider>
      </KeyboardProviderCompat>
    </GestureHandlerRootView>
  )
}
