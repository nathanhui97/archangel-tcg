import { useEffect, useState } from 'react'
import { View, Text, Modal, Pressable, TextInput, Alert } from 'react-native'
import { colors } from '@/lib/theme'

type Props = {
  visible: boolean
  initialName: string
  title?: string
  onSave: (next: string) => Promise<void> | void
  onCancel: () => void
}

/** Themed (phosphor-green) rename dialog — a centered card with a text field. */
export function RenameDialog({ visible, initialName, title = 'Rename binder', onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(initialName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) setDraft(initialName)
  }, [visible, initialName])

  async function save() {
    const trimmed = draft.trim()
    if (trimmed.length === 0 || trimmed.length > 60) {
      Alert.alert('Invalid name', 'Binder name must be 1–60 characters.')
      return
    }
    try {
      setSaving(true)
      await onSave(trimmed)
    } catch (err) {
      Alert.alert('Error', (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable
        onPress={onCancel}
        className="flex-1 items-center justify-center px-10"
        style={{ backgroundColor: 'rgba(2,4,3,0.6)' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full bg-surface-sheet rounded-3xl border border-primary-soft px-6 pt-6 pb-4"
        >
          <Text className="text-ink text-lg font-display-bold text-center mb-4">{title}</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            maxLength={60}
            placeholder="Binder name"
            placeholderTextColor={colors.faint2}
            className="bg-surface border border-subtle rounded-xl px-4 py-3 text-ink text-base font-display text-center"
            onSubmitEditing={save}
            returnKeyType="done"
          />
          <View className="flex-row gap-3 mt-5">
            <Pressable
              onPress={onCancel}
              className="flex-1 items-center py-3.5 rounded-2xl border border-subtle active:opacity-70"
            >
              <Text className="text-muted-2 font-display-semibold text-base">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving}
              className="flex-1 items-center py-3.5 rounded-2xl bg-primary active:opacity-90"
            >
              <Text className="font-display-bold text-base" style={{ color: colors.primaryInk }}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
