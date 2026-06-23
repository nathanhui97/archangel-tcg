import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { createBinder } from '@/lib/binders'

export default function NewBinderScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(true)
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
    <KeyboardAvoidingView
      className="flex-1 bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'New Binder',
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#ffffff',
        }}
      />

      <View className="flex-1 px-6 pt-8">
        <Text className="text-gray-300 text-sm mb-2 font-medium">Name</Text>
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t)
            if (error) setError(null)
          }}
          placeholder="e.g. Trade Binder · Keepers · Pulls"
          placeholderTextColor="#475569"
          autoFocus
          maxLength={60}
          editable={!saving}
          className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800 text-base"
        />
        <Text className="text-gray-500 text-xs mt-2">Up to 60 characters.</Text>

        <View className="mt-8 bg-gray-900 border border-gray-800 rounded-xl px-4 py-4 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-white font-medium">Public</Text>
            <Text className="text-gray-500 text-xs mt-1">
              Other players can browse this binder and see its cards for trade matching.
              Private binders are visible only to you.
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: '#1e293b', true: '#4f46e5' }}
            thumbColor="#ffffff"
            disabled={saving}
          />
        </View>

        {error && <Text className="text-red-400 text-sm mt-4 text-center">{error}</Text>}

        <Pressable
          onPress={handleCreate}
          disabled={saving || name.trim().length === 0}
          className={`mt-8 py-4 rounded-2xl items-center ${
            saving || name.trim().length === 0 ? 'bg-gray-800' : 'bg-indigo-600 active:opacity-80'
          }`}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">Create binder</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
