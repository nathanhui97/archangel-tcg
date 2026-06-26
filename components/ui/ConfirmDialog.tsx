import { View, Text, Modal, Pressable } from 'react-native'
import { colors } from '@/lib/theme'

type Props = {
  visible: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button for delete/remove actions. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Themed (phosphor-green) replacement for Alert.alert confirm dialogs. */
export function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive, onConfirm, onCancel,
}: Props) {
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

          <View className="flex-row gap-3 mt-6">
            <Pressable
              onPress={onCancel}
              className="flex-1 items-center py-3.5 rounded-2xl border border-subtle active:opacity-70"
            >
              <Text className="text-muted-2 font-display-semibold text-base">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className={`flex-1 items-center py-3.5 rounded-2xl active:opacity-90 ${destructive ? 'bg-danger' : 'bg-primary'}`}
            >
              <Text
                className="font-display-bold text-base"
                style={{ color: destructive ? '#240606' : colors.primaryInk }}
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
