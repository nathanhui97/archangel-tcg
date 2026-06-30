import { useState } from 'react'
import { View, Text, Pressable, Share, ActivityIndicator } from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import * as Clipboard from 'expo-clipboard'
import { useMyProfile } from '@/lib/profile'
import { Button } from '@/components/ui'
import { colors } from '@/lib/theme'

export default function InviteScreen() {
  const { profile } = useMyProfile()
  const handle = profile?.handle
  const [copied, setCopied] = useState(false)

  // Gate the QR + link on a loaded handle so we never render a real-looking but
  // invalid "bindar.app/i/me" link before the profile resolves.
  if (!handle) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Stack.Screen options={{ headerShown: true, title: 'Invite players' }} />
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  const link = `bindar.app/i/${handle}`
  const url = `https://${link}`

  async function copy() {
    await Clipboard.setStringAsync(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function share() {
    await Share.share({ message: `Trade cards with me on Bindar — ${url}` })
  }

  return (
    <View className="flex-1 bg-bg px-6">
      <Stack.Screen options={{ headerShown: true, title: 'Invite players' }} />

      <View className="items-center pt-4">
        <View className="bg-primary/10 border border-primary rounded-md px-2 py-0.5">
          <Text className="text-primary font-mono-bold text-[10px] tracking-[0.14em]">BETA</Text>
        </View>
        <Text className="text-ink text-[23px] font-display-bold mt-4 text-center">Bindar's better with your crew</Text>
        <Text className="text-muted text-sm mt-2 text-center font-display">
          Trades happen when your local scene is on the radar. Show this at your shop to add a player on the spot.
        </Text>
      </View>

      {/* QR */}
      <View className="items-center mt-8">
        <View className="bg-[#E9F3EC] rounded-3xl p-5">
          <QRCode value={url} size={170} color="#04140C" backgroundColor="#E9F3EC" />
        </View>
      </View>

      {/* Link row */}
      <View className="flex-row items-center bg-surface border border-subtle rounded-xl mt-8 pl-4 pr-1.5 py-1.5">
        <Text className="flex-1 text-dim font-mono text-sm" numberOfLines={1}>{link}</Text>
        <Pressable
          onPress={copy}
          className="flex-row items-center gap-1 bg-primary/10 border border-primary rounded-lg px-3 py-2 active:opacity-70"
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={colors.primary} />
          <Text className="text-primary font-display-semibold text-sm">{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </View>

      <View className="mt-5">
        <Button
          title="Share invite link"
          onPress={share}
          leading={<Ionicons name="share-outline" size={18} color={colors.primaryInk} />}
        />
      </View>
    </View>
  )
}
