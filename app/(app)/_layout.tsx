import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#ffffff',
        headerTitle: '',
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile-setup"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="cards" options={{ headerShown: true, title: 'Browse Cards' }} />
      <Stack.Screen name="binders/index" options={{ headerShown: true, title: 'My Binders' }} />
      <Stack.Screen name="binders/new" options={{ headerShown: true, title: 'New Binder' }} />
      <Stack.Screen name="binders/[id]" options={{ headerShown: true }} />
    </Stack>
  )
}
