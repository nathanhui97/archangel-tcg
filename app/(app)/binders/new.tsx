import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { createBinder } from '@/lib/binders'
import { Button, MonoLabel } from '@/components/ui'
import { RadarLogo } from '@/components/ui/RadarLogo'
import { colors } from '@/lib/theme'

function VisibilityCard({
  selected, onPress, icon, title, subtitle,
}: { selected: boolean; onPress: () => void; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center rounded-2xl px-4 py-4 border active:opacity-80 ${
        selected ? 'bg-primary/10 border-primary' : 'bg-surface border-subtle'
      }`}
    >
      <View className="w-9 h-9 rounded-xl bg-surface-control border border-subtle items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className={`font-display-semibold ${selected ? 'text-primary' : 'text-ink'}`}>{title}</Text>
        <Text className="text-muted text-xs mt-0.5 font-display">{subtitle}</Text>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? colors.primary : colors.faint2}
      />
    </Pressable>
  )
}

export default function NewBinderScreen() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(true) // default: on the radar
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (name.trim().length === 0) {
      setError('Give your binder a name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const binder = await createBinder(name, isPublic)
      router.replace(`/(app)/binders/${binder.id}`)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: true, title: 'New binder' }} />

      <View className="flex-1 px-6 pt-6">
        <MonoLabel className="text-primary mb-5">NEW BINDER</MonoLabel>

        <MonoLabel className="mb-2">NAME</MonoLabel>
        <View className="bg-surface rounded-xl px-4 border border-subtle">
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t)
              if (error) setError(null)
            }}
            placeholder="e.g. Gundam Trade Binder"
            placeholderTextColor={colors.faint2}
            autoFocus
            maxLength={60}
            editable={!saving}
            className="text-ink py-4 text-base font-display"
          />
        </View>

        <MonoLabel className="mt-7 mb-2">VISIBILITY</MonoLabel>
        <View className="gap-2.5">
          <VisibilityCard
            selected={isPublic}
            onPress={() => setIsPublic(true)}
            icon={<RadarLogo size={20} tone={isPublic ? 'primary' : 'ink'} />}
            title="Public"
            subtitle="Appears on traders' radar nearby"
          />
          <VisibilityCard
            selected={!isPublic}
            onPress={() => setIsPublic(false)}
            icon={<Ionicons name="lock-closed" size={16} color={!isPublic ? colors.primary : colors.muted} />}
            title="Private"
            subtitle="Only you can see it"
          />
        </View>

        {error && <Text className="text-danger text-sm mt-4 text-center font-display">{error}</Text>}

        <View className="mt-8">
          <Button title="Create binder" onPress={handleCreate} loading={saving} disabled={name.trim().length === 0} />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
