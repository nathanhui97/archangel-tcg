import { useEffect, useState } from 'react'
import { View, Text, Modal, Pressable, TextInput, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/lib/theme'

type Props = {
  visible: boolean
  onClose: () => void
  name: string
  isPublic: boolean
  onRename: (next: string) => Promise<void> | void
  onSetPublic: (next: boolean) => Promise<void> | void
  onDelete: () => void
}

function Row({
  icon, label, onPress, danger, tint,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  danger?: boolean
  tint?: string
}) {
  const color = danger ? colors.danger : tint ?? colors.ink
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-1 py-3.5 active:opacity-60"
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text className="text-base font-display-medium" style={{ color }}>{label}</Text>
    </Pressable>
  )
}

/** Bottom sheet for managing a binder: rename, public/private, delete. */
export function BinderMenuSheet({ visible, onClose, name, isPublic, onRename, onSetPublic, onDelete }: Props) {
  const insets = useSafeAreaInsets()
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(name)
  const [saving, setSaving] = useState(false)

  // Reset to the menu (not rename mode) each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setRenaming(false)
      setDraft(name)
    }
  }, [visible, name])

  async function saveRename() {
    const trimmed = draft.trim()
    if (trimmed.length === 0 || trimmed.length > 60) {
      Alert.alert('Invalid name', 'Binder name must be 1–60 characters.')
      return
    }
    try {
      setSaving(true)
      await onRename(trimmed)
      onClose()
    } catch (err) {
      Alert.alert('Error', (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(2,4,3,0.55)' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-sheet rounded-t-[26px] border-t border-primary-soft px-6 pt-3"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="self-center w-9 h-1 rounded-full bg-track mb-4" />

          {renaming ? (
            <View>
              <Text className="text-ink text-lg font-display-bold mb-3">Rename binder</Text>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                autoFocus
                maxLength={60}
                placeholder="Binder name"
                placeholderTextColor={colors.faint2}
                className="bg-surface border border-subtle rounded-xl px-4 py-3 text-ink text-base font-display"
                onSubmitEditing={saveRename}
                returnKeyType="done"
              />
              <View className="flex-row gap-3 mt-4">
                <Pressable
                  onPress={() => setRenaming(false)}
                  className="flex-1 items-center py-3.5 rounded-2xl border border-subtle active:opacity-70"
                >
                  <Text className="text-muted-2 font-display-semibold text-base">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveRename}
                  disabled={saving}
                  className="flex-1 items-center py-3.5 rounded-2xl bg-primary active:opacity-90"
                >
                  <Text className="text-primary-ink font-display-bold text-base">{saving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View>
              <Text className="text-faint-2 text-[11px] font-mono uppercase tracking-wider mb-1" numberOfLines={1}>
                {name}
              </Text>
              <Row icon="create-outline" label="Rename" onPress={() => setRenaming(true)} />
              <View className="h-px" style={{ backgroundColor: colors.borderHair }} />
              <Row
                icon={isPublic ? 'lock-closed-outline' : 'globe-outline'}
                label={isPublic ? 'Make private' : 'Make public'}
                tint={colors.primary}
                onPress={async () => {
                  try {
                    await onSetPublic(!isPublic)
                    onClose()
                  } catch (err) {
                    Alert.alert('Error', (err as Error).message)
                  }
                }}
              />
              <View className="h-px" style={{ backgroundColor: colors.borderHair }} />
              <Row
                icon="trash-outline"
                label="Delete binder"
                danger
                onPress={() => {
                  onClose()
                  onDelete()
                }}
              />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
