import { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ViewStyle } from 'react-native'
import Constants from 'expo-constants'

// react-native-keyboard-controller is a NATIVE module — it isn't present in
// Expo Go, only in a development/production build. Touching it in Expo Go crashes
// ("getConstants is not a function"), so we gate it behind a runtime check and
// fall back to React Native's KeyboardAvoidingView there.
const isExpoGo = Constants.executionEnvironment === 'storeClient'

export function KeyboardProviderCompat({ children }: { children: ReactNode }) {
  if (isExpoGo) return <>{children}</>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { KeyboardProvider } = require('react-native-keyboard-controller')
  return <KeyboardProvider>{children}</KeyboardProvider>
}

/** KeyboardAvoidingView that uses keyboard-controller on a dev build, RN's in Expo Go. */
export function ChatKeyboardAvoider({
  children,
  offset,
  style,
}: {
  children: ReactNode
  offset: number
  style?: ViewStyle
}) {
  if (!isExpoGo) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { KeyboardAvoidingView: KCAvoidingView } = require('react-native-keyboard-controller')
    return (
      <KCAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={style}>
        {children}
      </KCAvoidingView>
    )
  }
  return (
    <KeyboardAvoidingView
      style={style}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? offset : 0}
    >
      {children}
    </KeyboardAvoidingView>
  )
}
