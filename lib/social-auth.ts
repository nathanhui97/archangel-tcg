import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { supabase } from './supabase'

/**
 * Native social sign-in (Apple + Google) wired to Supabase via signInWithIdToken.
 *
 * IMPORTANT: the underlying native modules (@react-native-google-signin and
 * expo-apple-authentication's native button) only exist in a dev/standalone
 * build — NOT in Expo Go. We therefore (a) detect Expo Go and short-circuit,
 * and (b) lazy-require the Google module so importing this file never crashes
 * the JS bundle in Expo Go. The login screen hides the buttons when isExpoGo.
 */
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient

// Web client ID is the OAuth audience Supabase validates against (used on BOTH
// platforms). iOS client ID is needed for the native iOS Google flow.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

export type SocialResult = { error?: string; cancelled?: boolean }

let googleConfigured = false

// Lazy require so Expo Go (which lacks the native module) doesn't crash on load.
function loadGoogle() {
  return require('@react-native-google-signin/google-signin')
}

export async function signInWithGoogle(): Promise<SocialResult> {
  if (isExpoGo) return { error: 'Google sign-in needs a dev build (not Expo Go).' }
  if (!GOOGLE_WEB_CLIENT_ID) {
    return { error: 'Google sign-in is not configured yet. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.' }
  }
  try {
    const { GoogleSignin, statusCodes } = loadGoogle()
    if (!googleConfigured) {
      // [TEMP DEBUG] confirm the exact webClientId reaching the native layer
      console.log('[google-debug] webClientId =', JSON.stringify(GOOGLE_WEB_CLIENT_ID))
      console.log('[google-debug] iosClientId =', JSON.stringify(GOOGLE_IOS_CLIENT_ID))
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
      })
      googleConfigured = true
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const result = await GoogleSignin.signIn()

    // v13+ returns { type: 'success' | 'cancelled', data }; older returns userInfo directly.
    if (result?.type === 'cancelled') return { cancelled: true }
    const idToken = result?.data?.idToken ?? result?.idToken
    if (!idToken) return { error: 'Google did not return an ID token.' }

    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
    if (error) return { error: error.message }
    return {}
  } catch (e: any) {
    // [TEMP DEBUG] dump the full error so we can see code + message
    console.log('[google-debug] sign-in error code =', JSON.stringify(e?.code))
    console.log('[google-debug] sign-in error message =', JSON.stringify(e?.message))
    console.log('[google-debug] full error =', JSON.stringify(e, Object.getOwnPropertyNames(e ?? {})))
    try {
      const { statusCodes } = loadGoogle()
      if (e?.code === statusCodes?.SIGN_IN_CANCELLED) return { cancelled: true }
    } catch {
      /* ignore */
    }
    return { error: e?.message ?? 'Google sign-in failed.' }
  }
}

export async function appleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios' || isExpoGo) return false
  try {
    const AppleAuthentication = require('expo-apple-authentication')
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}

export async function signInWithApple(): Promise<SocialResult> {
  if (Platform.OS !== 'ios') return { error: 'Apple sign-in is available on iOS only.' }
  if (isExpoGo) return { error: 'Apple sign-in needs a dev build (not Expo Go).' }
  try {
    const AppleAuthentication = require('expo-apple-authentication')
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
    if (!credential.identityToken) return { error: 'Apple did not return an identity token.' }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    })
    if (error) return { error: error.message }
    return {}
  } catch (e: any) {
    // User dismissed the native Apple sheet.
    if (e?.code === 'ERR_REQUEST_CANCELED') return { cancelled: true }
    return { error: e?.message ?? 'Apple sign-in failed.' }
  }
}
