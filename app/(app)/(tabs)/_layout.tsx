import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIncomingTradeCount } from '@/lib/trades'
import { colors } from '@/lib/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function tabIcon(name: IoniconsName, focusedName: IoniconsName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons
      name={focused ? focusedName : name}
      size={size}
      color={color}
      style={focused ? { textShadowColor: colors.primary, textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } } : undefined}
    />
  )
}

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { count: incoming } = useIncomingTradeCount()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: 'rgba(120,255,180,0.12)',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint2,
      }}
    >
      <Tabs.Screen
        name="trade"
        options={{ title: 'Trade', tabBarIcon: tabIcon('swap-horizontal-outline', 'swap-horizontal') }}
      />
      <Tabs.Screen
        name="social"
        options={{ title: 'Social', tabBarIcon: tabIcon('flame-outline', 'flame') }}
      />
      <Tabs.Screen
        name="my-cards"
        options={{ title: 'Binders', tabBarIcon: tabIcon('albums-outline', 'albums') }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: tabIcon('chatbubble-outline', 'chatbubble'),
          tabBarBadge: incoming > 0 ? incoming : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.primaryInk, fontFamily: 'JetBrainsMono_700Bold', fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline', 'person') }}
      />
    </Tabs>
  )
}
