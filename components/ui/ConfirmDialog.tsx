import { useEffect, useState } from 'react'
import { View, Text, Modal, Pressable, TextInput } from 'react-native'
import { colors } from '@/lib/theme'

type Props = {
  visible: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button for delete/remove actions. */
  destructive?: boolean
  /**
   * Require the user to type this word (case-insensitive) before the confirm
   * button enables — a guardrail for irreversible actions like deletion.
   */
  requireText?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Themed (phosphor-green) replacement for Alert.alert confirm dialogs. */
export function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive, requireText, onConfirm, onCancel,
}: Props) {
  const [text, setText] = useState('')

  // Clear the typed confirmation whenever the dialog opens or closes.
  useEffect(() => {
    if (!visible) setText('')
  }, [visible])

  const matched = !requireText || text.trim().toLowerCase() === requireText.toLowerCase()

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
          <Text className="text-ink text-lg font-display-bold text-center">{title}</Text>
          {message ? (
            <Text className="text-muted text-sm font-display text-center mt-2 leading-5">{message}</Text>
          ) : null}

          {requireText ? (
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={`Type "${requireText}" to confirm`}
              placeholderTextColor={colors.faint2}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              className="bg-surface border border-subtle rounded-xl px-4 py-3.5 mt-4 text-ink font-mono text-base text-center"
            />
          ) : null}

          <View className="flex-row gap-3 mt-6">
            <Pressable
              onPress={onCancel}
              className="flex-1 items-center py-3.5 rounded-2xl border border-subtle active:opacity-70"
            >
              <Text className="text-muted-2 font-display-semibold text-base">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={matched ? onConfirm : undefined}
              disabled={!matched}
              className={`flex-1 items-center py-3.5 rounded-2xl ${
                matched ? (destructive ? 'bg-danger' : 'bg-primary') + ' active:opacity-90' : 'bg-surface-control'
              }`}
            >
              <Text
                className="font-display-bold text-base"
                style={{ color: matched ? (destructive ? '#240606' : colors.primaryInk) : colors.faint2 }}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
