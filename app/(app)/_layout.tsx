import { Stack } from 'expo-router'
import { colors } from '@/lib/theme'

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold' },
        headerTitle: '',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {/* Tabs are the main shell — no header (tabs have their own) */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile-setup" options={{ headerShown: false, gestureEnabled: false }} />
      {/* Stack screens pushed on top of tabs */}
      <Stack.Screen name="cards" options={{ headerShown: true, title: 'Browse Cards' }} />
      <Stack.Screen name="trades" options={{ headerShown: true, title: 'For trade' }} />
      <Stack.Screen name="matches" options={{ headerShown: true, title: 'Matches' }} />
      <Stack.Screen name="invite" options={{ headerShown: true, title: 'Invite players' }} />
      <Stack.Screen name="card/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="trader/[handle]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="messages" options={{ headerShown: true, title: 'Trades' }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="binders/index" options={{ headerShown: true, title: 'My Binders' }} />
      <Stack.Screen name="binders/new" options={{ headerShown: true, title: 'New binder' }} />
      <Stack.Screen name="binders/[id]" options={{ headerShown: true }} />
      <Stack.Screen name="wantlist/index" options={{ headerShown: true, title: 'Wantlist' }} />
      <Stack.Screen name="wantlist/add" options={{ headerShown: true, title: 'Add to wantlist' }} />
    </Stack>
  )
}
