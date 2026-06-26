import { View, Text, Modal, Pressable, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/lib/theme'

type Props = {
  visible: boolean
  onClose: () => void
  name: string
  isPublic: boolean
  onRequestRename: () => void
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
    <Pressable onPress={onPress} className="flex-row items-center gap-3 px-1 py-3.5 active:opacity-60">
      <Ionicons name={icon} size={20} color={color} />
      <Text className="text-base font-display-medium" style={{ color }}>{label}</Text>
    </Pressable>
  )
}

/** Bottom sheet for managing a binder: rename, public/private, delete. */
export function BinderMenuSheet({ visible, onClose, name, isPublic, onRequestRename, onSetPublic, onDelete }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(2,4,3,0.55)' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-sheet rounded-t-[26px] border-t border-primary-soft px-6 pt-3"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="self-center w-9 h-1 rounded-full bg-track mb-4" />

          <Text className="text-faint-2 text-[11px] font-mono uppercase tracking-wider mb-1" numberOfLines={1}>
            {name}
          </Text>

          <Row
            icon="create-outline"
            label="Rename"
            onPress={() => {
              onClose()
              onRequestRename()
            }}
          />
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
        </Pressable>
      </Pressable>
    </Modal>
  )
}
