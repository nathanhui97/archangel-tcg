import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  useBinder,
  addCardsToBinder,
  removeBinderItem,
  updateBinder,
  reorderBinderItems,
  deleteBinder,
} from '@/lib/binders'
import { CardPicker } from '@/components/CardPicker'
import { DraggableCardGrid } from '@/components/DraggableCardGrid'
import { BinderMenuSheet } from '@/components/BinderMenuSheet'
import { useAuth } from '@/lib/auth'
import { gridTileWidth } from '@/components/ui/CardTile'
import { colors } from '@/lib/theme'
import type { BinderItem } from '@/types'

const CARD_RATIO = 5 / 7

function HeaderButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1 bg-primary/10 border border-primary rounded-lg px-3 py-1.5 active:opacity-70"
    >
      {icon && <Ionicons name="add" size={15} color={colors.primary} />}
      <Text className="text-primary font-display-semibold text-sm">{label}</Text>
    </Pressable>
  )
}

/** Image-only card tile with condition/foil + quantity badges (no captions, so 9 fit). */
function CardFace({ item, width, height }: { item: BinderItem; width: number; height: number }) {
  return (
    <View
      style={{ width, height }}
      className="rounded-lg overflow-hidden bg-surface-raised border border-subtle"
    >
      {item.card?.image_url ? (
        <Image source={{ uri: item.card.image_url }} resizeMode="cover" className="w-full h-full" />
      ) : null}
      <View className="absolute top-1 left-1 bg-bg/80 rounded px-1 py-0.5">
        <Text className="text-muted-2 font-mono-bold text-[9px]">
          {item.condition}{item.is_foil ? ' ✦' : ''}
        </Text>
      </View>
      {item.quantity > 1 ? (
        <View className="absolute top-1 right-1 bg-bg/80 rounded px-1">
          <Text className="text-ink font-mono-bold text-[10px]">×{item.quantity}</Text>
        </View>
      ) : null}
    </View>
  )
}

export default function BinderDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const { binder, items, loading, error, refresh } = useBinder(id)
  const [adding, setAdding] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isOwner = !!binder && !!session && binder.user_id === session.user.id

  const { width } = useWindowDimensions()
  const tileW = gridTileWidth(width)
  const tileH = tileW / CARD_RATIO

  function confirmRemove(item: BinderItem) {
    const name = item.card?.name ?? 'this card'
    Alert.alert(`Remove ${name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeBinderItem(item.id)
            refresh()
          } catch (err) {
            Alert.alert('Error', (err as Error).message)
          }
        },
      },
    ])
  }

  async function handleReorder(orderedIds: string[]) {
    try {
      await reorderBinderItems(orderedIds)
    } catch (err) {
      Alert.alert('Error', (err as Error).message)
    } finally {
      refresh()
    }
  }

  function confirmDeleteBinder() {
    if (!binder) return
    Alert.alert(
      `Delete ${binder.name}?`,
      'This removes the binder and every card inside it. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBinder(binder.id)
              router.back()
            } catch (err) {
              Alert.alert('Error', (err as Error).message)
            }
          },
        },
      ]
    )
  }

  async function setPublic(value: boolean) {
    if (!binder || binder.is_public === value) return
    await updateBinder(binder.id, { is_public: value })
    refresh()
  }

  async function rename(next: string) {
    if (!binder) return
    await updateBinder(binder.id, { name: next })
    refresh()
  }

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (error || !binder) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-danger text-sm font-display">{error ?? 'Binder not found.'}</Text>
        <Pressable onPress={() => router.back()} className="mt-4 active:opacity-60">
          <Text className="text-primary font-display-medium">← Back</Text>
        </Pressable>
      </View>
    )
  }

  // "Add cards" mode — full-catalog multi-select picker
  if (adding) {
    return (
      <View className="flex-1 bg-bg">
        <Stack.Screen
          options={{
            headerShown: true,
            title: '',
            headerRight: () => <HeaderButton label="Done" onPress={() => setAdding(false)} />,
          }}
        />
        <CardPicker
          title={`Add to ${binder.name}`}
          addNoun="binder"
          onAdd={async (cardIds) => {
            await addCardsToBinder(binder.id, cardIds)
            refresh()
          }}
        />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerRight: isOwner
            ? () => (
                <View className="flex-row items-center gap-2">
                  <HeaderButton label="Add" icon onPress={() => setAdding(true)} />
                  <Pressable
                    onPress={() => setMenuOpen(true)}
                    hitSlop={8}
                    className="w-8 h-8 items-center justify-center active:opacity-60"
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.ink} />
                  </Pressable>
                </View>
              )
            : undefined,
        }}
      />

      <View className="px-5 pt-1 pb-3">
        <Text className="text-ink text-[22px] font-display-bold" numberOfLines={1}>{binder.name}</Text>
        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-muted text-sm font-display">
            {items.length} card{items.length !== 1 ? 's' : ''}
          </Text>

          {isOwner ? (
            <View className="flex-row bg-surface border border-subtle rounded-xl p-0.5">
              {([true, false] as const).map((pub) => {
                const active = binder.is_public === pub
                return (
                  <Pressable
                    key={String(pub)}
                    onPress={() =>
                      setPublic(pub).catch((err) => Alert.alert('Error', (err as Error).message))
                    }
                    className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-[10px] ${active ? 'bg-primary/10' : ''}`}
                  >
                    {pub && active && <View className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    <Text className={`text-xs font-display-medium ${active ? 'text-primary' : 'text-muted-2'}`}>
                      {pub ? 'Public' : 'Private'}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : (
            <Text className={`text-xs font-display-medium ${binder.is_public ? 'text-primary' : 'text-faint-2'}`}>
              {binder.is_public ? 'Public' : 'Private'}
            </Text>
          )}
        </View>
      </View>

      {items.length === 0 ? (
        <View className="items-center py-16 px-6">
          <Text className="text-ink font-display-semibold text-lg">No cards yet</Text>
          <Text className="text-muted text-sm mt-2 text-center font-display">
            {isOwner ? 'Tap "Add" to search and add your first card.' : 'This binder is empty.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          {isOwner ? (
            <DraggableCardGrid
              items={items}
              tileWidth={tileW}
              tileHeight={tileH}
              onReorder={handleReorder}
              onTapItem={(item) => confirmRemove(item)}
              renderItem={(item) => <CardFace item={item} width={tileW} height={tileH} />}
            />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push({ pathname: '/(app)/card/[id]', params: { id: item.card_id } })}
                  className="active:opacity-80"
                >
                  <CardFace item={item} width={tileW} height={tileH} />
                </Pressable>
              ))}
            </View>
          )}

          {isOwner && (
            <View className="flex-row items-center justify-center gap-1.5 pt-4">
              <Ionicons name="information-circle-outline" size={13} color={colors.faint} />
              <Text className="text-faint text-xs font-display">Tap to remove · long-press to reorder</Text>
            </View>
          )}
        </ScrollView>
      )}

      <BinderMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        name={binder.name}
        isPublic={binder.is_public}
        onRename={rename}
        onSetPublic={setPublic}
        onDelete={confirmDeleteBinder}
      />
    </View>
  )
}
