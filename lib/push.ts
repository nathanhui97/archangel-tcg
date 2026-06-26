import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { supabase } from './supabase'
import { useAuth } from './auth'

// Push only works in a dev/prod build, never in Expo Go.
const isExpoGo = Constants.executionEnvironment === 'storeClient'

// How notifications render when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

async function registerToken(userId: string) {
  if (isExpoGo) return
  try {
    let settings = await Notifications.getPermissionsAsync()
    if (!settings.granted) {
      settings = await Notifications.requestPermissionsAsync()
    }
    if (!settings.granted) return

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)

    await supabase
      .from('push_tokens')
      .upsert({ user_id: userId, token: tokenData.data, platform: Platform.OS }, { onConflict: 'user_id,token' })
  } catch {
    // Best-effort: never block the app on push registration.
  }
}

/** Register this device for push on login and route taps to the right chat. */
export function usePushNotifications() {
  const { session } = useAuth()
  const sub = useRef<Notifications.EventSubscription | null>(null)

  useEffect(() => {
    if (session?.user.id) registerToken(session.user.id)
  }, [session?.user.id])

  useEffect(() => {
    sub.current = Notifications.addNotificationResponseReceivedListener((resp) => {
      const tradeId = (resp.notification.request.content.data as any)?.tradeId
      if (tradeId) router.push({ pathname: '/(app)/chat/[id]', params: { id: String(tradeId) } })
    })
    return () => sub.current?.remove()
  }, [])
}
