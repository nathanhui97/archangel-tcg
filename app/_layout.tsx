import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { AuthProvider, useAuth } from '@/lib/auth'
import '../global.css'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, hasProfile } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inAppGroup = segments[0] === '(app)'

    if (!session) {
      // Not signed in — push back to the landing screen if they're in protected routes
      if (inAppGroup) router.replace('/')
      return
    }

    // Signed in
    if (hasProfile === null) return  // profile check still in flight

    if (hasProfile) {
      // Has profile: leave them in the app, but if they're sitting on landing/auth, send them home
      if (!inAppGroup) router.replace('/(app)')
    } else {
      // No profile yet: force them to profile-setup
      if (segments.join('/') !== '(app)/profile-setup') {
        router.replace('/(app)/profile-setup')
      }
    }
  }, [session, loading, hasProfile, segments, router])

  if (loading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0f172a' },
            headerTintColor: '#ffffff',
            contentStyle: { backgroundColor: '#0f172a' },
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
  )
}
