import { useState, useEffect, useMemo, useCallback } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  useBinder,
  addCardsToBinder,
  removeBinderItem,
  updateBinder,
  reorderBinderItems,
  deleteBinder,
  setBinderCover,
} from '@/lib/binders'
import { pickNotableCard, type NotableCard } from '@/lib/pulls'
import { useBinderValue, formatPrice } from '@/lib/prices'
import { useBinderVerificationStatus } from '@/lib/verifications'
import { CardPicker } from '@/components/CardPicker'
import { PullCelebration } from '@/components/PullCelebration'
import { DraggableCardGrid } from '@/components/DraggableCardGrid'
import { BinderMenuSheet } from '@/components/BinderMenuSheet'
import { CoverPickerSheet } from '@/components/CoverPickerSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RenameDialog } from '@/components/ui/RenameDialog'
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
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const { binder, items, loading, error, refresh } = useBinder(id)
  const { value: binderValue } = useBinderValue(items)
  const { pending: verifPending, refresh: refreshVerif } = useBinderVerificationStatus(binder?.id)

  // Re-check verification state when returning from the verify screen.
  useFocusEffect(useCallback(() => { refreshVerif() }, [refreshVerif]))
  const [adding, setAdding] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [celebration, setCelebration] = useState<NotableCard | null>(null)
  const [confirm, setConfirm] = useState<
    { title: string; message?: string; confirmLabel: string; onConfirm: () => void } | null
  >(null)

  const isOwner = !!binder && !!session && binder.user_id === session.user.id

  const { width } = useWindowDimensions()
  const tileW = gridTileWidth(width)
  const tileH = tileW / CARD_RATIO

  // Cover = the chosen card's art, falling back to the binder's first card.
  const coverUrl = useMemo(() => {
    const chosen = binder?.cover_card_id
      ? items.find((i) => i.card_id === binder.cover_card_id)?.card?.image_url
      : null
    return chosen ?? items[0]?.card?.image_url ?? null
  }, [binder?.cover_card_id, items])

  // Leave edit mode automatically once the binder is empty.
  useEffect(() => {
    if (items.length === 0 && editing) setEditing(false)
  }, [items.length, editing])

  function handleDeleteItem(item: BinderItem) {
    const name = item.card?.name ?? 'this card'
    setConfirm({
      title: `Remove ${name}?`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await removeBinderItem(item.id)
          refresh()
        } catch (err) {
          Alert.alert('Error', (err as Error).message)
        }
      },
    })
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
    setConfirm({
      title: `Delete ${binder.name}?`,
      message: 'This removes the binder and every card inside it. This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteBinder(binder.id)
          router.back()
        } catch (err) {
          Alert.alert('Error', (err as Error).message)
        }
      },
    })
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

  async function pickCover(cardId: string) {
    if (!binder) return
    try {
      await setBinderCover(binder.id, cardId)
      refresh()
    } catch (err) {
      Alert.alert('Error', (err as Error).message)
    }
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
          allowMultiple
          onAdd={async (cardIds) => {
            try {
              await addCardsToBinder(binder.id, cardIds)
              refresh()
              setAdding(false) // return to the binder so the user sees the new cards
              // Nudge a share only for a notable card (alt-art / rare) — never bulk.
              const notable = await pickNotableCard(cardIds)
              if (notable) setCelebration(notable)
            } catch (err) {
              Alert.alert('Could not add cards', (err as Error).message)
            }
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
            ? () =>
                editing ? (
                  <HeaderButton label="Done" onPress={() => setEditing(false)} />
                ) : (
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

      <View className="items-center px-5 pt-2 pb-4">
        {/* Cover card */}
        <Pressable
          onPress={isOwner && items.length > 0 ? () => setCoverOpen(true) : undefined}
          className="active:opacity-80"
        >
          <View
            style={{ width: 116, height: 116 / CARD_RATIO }}
            className="rounded-xl overflow-hidden bg-surface-raised border border-subtle"
          >
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} resizeMode="cover" className="w-full h-full" />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <Ionicons name="albums-outline" size={28} color={colors.faint2} />
              </View>
            )}
          </View>
          {isOwner && items.length > 0 ? (
            <View
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-primary items-center justify-center border-2"
              style={{ borderColor: colors.bg }}
            >
              <Ionicons name="image" size={14} color={colors.primaryInk} />
            </View>
          ) : null}
        </Pressable>

        {/* Name + edit pencil */}
        <Pressable
          onPress={isOwner ? () => setRenameOpen(true) : undefined}
          className="flex-row items-center gap-1.5 mt-3 active:opacity-70"
        >
          <Text className="text-ink text-xl font-display-bold text-center" numberOfLines={1}>{binder.name}</Text>
          {isOwner ? <Ionicons name="pencil" size={15} color={colors.muted2} /> : null}
        </Pressable>

        {/* Count · public/private */}
        <View className="flex-row items-center justify-center gap-2 mt-1.5">
          <Text className="text-muted text-sm font-display">
            {items.length} card{items.length !== 1 ? 's' : ''}
          </Text>
          <Text className="text-faint-2 text-sm">·</Text>
          {isOwner ? (
            <Pressable
              onPress={() => setPublic(!binder.is_public).catch((err) => Alert.alert('Error', (err as Error).message))}
              className="flex-row items-center gap-1 active:opacity-70"
            >
              <View className={`w-1.5 h-1.5 rounded-full ${binder.is_public ? 'bg-primary' : 'bg-faint-2'}`} />
              <Text className={`text-sm font-display-medium ${binder.is_public ? 'text-primary' : 'text-muted-2'}`}>
                {binder.is_public ? 'Public' : 'Private'}
              </Text>
            </Pressable>
          ) : (
            <Text className={`text-sm font-display-medium ${binder.is_public ? 'text-primary' : 'text-faint-2'}`}>
              {binder.is_public ? 'Public' : 'Private'}
            </Text>
          )}
        </View>

        {binderValue != null && binderValue > 0 ? (
          <View className="flex-row items-center gap-1 mt-2 bg-primary/10 border border-primary/30 rounded-full px-3 py-1">
            <Ionicons name="pricetag" size={12} color={colors.primary} />
            <Text className="text-primary font-mono-bold text-xs">≈ {formatPrice(binderValue)} USD</Text>
            <Text className="text-faint text-[11px] font-display">est. value</Text>
          </View>
        ) : null}

        {/* Verification: verified chip (anyone) · pending / Verify CTA (owner, public) */}
        {binder.verified_at ? (
          <View className="flex-row items-center gap-1 mt-2 bg-primary/10 border border-primary/40 rounded-full px-3 py-1">
            <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
            <Text className="text-primary font-mono-bold text-xs tracking-wider">VERIFIED</Text>
          </View>
        ) : isOwner && binder.is_public ? (
          verifPending ? (
            <View className="flex-row items-center gap-1.5 mt-2 bg-surface border border-subtle rounded-full px-3 py-1">
              <Ionicons name="time-outline" size={12} color={colors.muted2} />
              <Text className="text-muted-2 font-display-medium text-xs">Verification pending</Text>
            </View>
          ) : (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/(app)/verify-binder', params: { binderId: binder.id, binderName: binder.name } })
              }
              className="flex-row items-center gap-1.5 mt-2 bg-primary/10 border border-primary rounded-full px-3.5 py-1.5 active:opacity-80"
            >
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.primary} />
              <Text className="text-primary font-display-semibold text-xs">Verify binder ✓</Text>
            </Pressable>
          )
        ) : null}
      </View>

      {items.length === 0 ? (
        <View className="items-center py-16 px-6">
          <Text className="text-ink font-display-semibold text-lg">No cards yet</Text>
          <Text className="text-muted text-sm mt-2 text-center font-display">
            {isOwner ? 'Tap "Add" to search and add your first card.' : 'This binder is empty.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}>
          {isOwner ? (
            <DraggableCardGrid
              items={items}
              tileWidth={tileW}
              tileHeight={tileH}
              editing={editing}
              onReorder={handleReorder}
              onRequestEdit={() => setEditing(true)}
              onDeleteItem={handleDeleteItem}
              onItemPress={(item) =>
                Alert.alert(item.card?.name ?? 'Card', undefined, [
                  {
                    text: 'Share as pull ✨',
                    onPress: () =>
                      router.push({
                        pathname: '/(app)/share-pull',
                        params: { cardId: item.card_id, binderItemId: item.id },
                      }),
                  },
                  {
                    text: 'View card',
                    onPress: () => router.push({ pathname: '/(app)/card/[id]', params: { id: item.card_id } }),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
              renderItem={(item) => <CardFace item={item} width={tileW} height={tileH} />}
            />
          ) : (
            // Read-only 3-col grid (same absolute layout as the owner grid, so it
            // doesn't hit the flex-wrap exact-fit bug). Tap opens the card.
            <DraggableCardGrid
              items={items}
              tileWidth={tileW}
              tileHeight={tileH}
              editing={false}
              onReorder={() => {}}
              onItemPress={(item) =>
                router.push({
                  pathname: '/(app)/binder-card',
                  params: { cardId: item.card_id, ownerId: binder.user_id },
                })
              }
              renderItem={(item) => <CardFace item={item} width={tileW} height={tileH} />}
            />
          )}

          {isOwner && (
            <View className="flex-row items-center justify-center gap-1.5 pt-4">
              <Ionicons name="information-circle-outline" size={13} color={colors.faint} />
              <Text className="text-faint text-xs font-display">
                {editing ? 'Drag to reorder · tap ✕ to delete · Done when finished' : 'Hold a card to rearrange or delete'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <BinderMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        name={binder.name}
        isPublic={binder.is_public}
        onRequestRename={() => setRenameOpen(true)}
        onSetPublic={setPublic}
        onDelete={confirmDeleteBinder}
      />

      <CoverPickerSheet
        visible={coverOpen}
        onClose={() => setCoverOpen(false)}
        items={items}
        currentCoverId={binder.cover_card_id}
        onPick={pickCover}
      />

      <RenameDialog
        visible={renameOpen}
        initialName={binder.name}
        onSave={async (next) => {
          await rename(next)
          setRenameOpen(false)
        }}
        onCancel={() => setRenameOpen(false)}
      />

      <PullCelebration
        visible={!!celebration}
        card={celebration}
        onShare={() => {
          const c = celebration
          setCelebration(null)
          if (c) router.push({ pathname: '/(app)/share-pull', params: { cardId: c.id } })
        }}
        onDismiss={() => setCelebration(null)}
      />

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        destructive
        onConfirm={() => {
          confirm?.onConfirm()
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  )
}
