import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TextInput, FlatList, Pressable,
  ActivityIndicator, useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useCardSearch, fetchCardFacets } from '@/lib/cards'
import { Chip } from '@/components/ui'
import { CardTile, gridTileWidth } from '@/components/ui/CardTile'
import { CardFilterSheet, type CardFilters } from '@/components/CardFilterSheet'
import { colors } from '@/lib/theme'

const GAME_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'All', value: null },
  { label: 'Gundam', value: 'gundam' },
  { label: 'One Piece', value: 'one_piece' },
]

type Props = {
  /** Header title, e.g. "Add to Gundam Trade Binder" or "Add to wantlist". */
  title?: string
  /** Optional one-line context under the title. */
  subtitle?: string
  /** Noun for the add button: `Add N to ${addNoun}`. */
  addNoun?: string
  /** Cards already in the target — shown as "ON LIST" and not selectable. */
  addedIds?: Set<string>
  /** Allow adding multiple copies of the same card (tap = +1, long-press = −1). */
  allowMultiple?: boolean
  /** Initial TCG filter. Defaults to Gundam. Pass null for "All". */
  defaultGame?: string | null
  /** Default behaviour: add the picked cards (and clear the selection). */
  onAdd?: (cardIds: string[]) => Promise<void>
  /**
   * Single-action mode (onboarding): the sticky button submits AND the caller
   * navigates away, so the selection is NOT cleared. When provided this
   * replaces onAdd. With submitEmptyLabel set, the button stays enabled at 0
   * selected (so it doubles as "Skip"), calling onSubmit([]).
   */
  onSubmit?: (cardIds: string[]) => Promise<void> | void
  submitWithLabel?: (count: number) => string
  submitEmptyLabel?: string
}

/** Full-catalog multi-select card picker (Pokémon-Pocket-style "Add to …"). */
export function CardPicker({
  title = 'Add cards', subtitle, addNoun = 'binder', addedIds, allowMultiple,
  defaultGame = 'gundam', onAdd, onSubmit, submitWithLabel, submitEmptyLabel,
}: Props) {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const tileW = gridTileWidth(width)

  const [query, setQuery] = useState('')
  const [game, setGame] = useState<string | null>(defaultGame)
  const [filters, setFilters] = useState<CardFilters>({ setCode: null, color: null, cardType: null })
  const [filterOpen, setFilterOpen] = useState(false)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [facets, setFacets] = useState<{ sets: { code: string; name: string }[]; colors: string[]; cardTypes: string[] }>({
    sets: [], colors: [], cardTypes: [],
  })
  const [saving, setSaving] = useState(false)

  const { results, loading, error } = useCardSearch(query, {
    game,
    setCode: filters.setCode,
    color: filters.color,
    cardType: filters.cardType,
    limit: 60,
  })

  // Load filter facets for the chosen game (sets/colors/types come from the scrape).
  useEffect(() => {
    let active = true
    setFilters({ setCode: null, color: null, cardType: null })
    if (!game) {
      setFacets({ sets: [], colors: [], cardTypes: [] })
      return
    }
    fetchCardFacets(game).then((f) => {
      if (active) setFacets(f)
    })
    return () => {
      active = false
    }
  }, [game])

  const activeFilters = [filters.setCode, filters.color, filters.cardType].filter(Boolean).length

  function tapCard(cardId: string) {
    setCounts((prev) => {
      const next = new Map(prev)
      if (allowMultiple) next.set(cardId, (next.get(cardId) ?? 0) + 1)
      else if (next.has(cardId)) next.delete(cardId)
      else next.set(cardId, 1)
      return next
    })
  }

  function decrementCard(cardId: string) {
    setCounts((prev) => {
      const next = new Map(prev)
      const v = (next.get(cardId) ?? 0) - 1
      if (v <= 0) next.delete(cardId)
      else next.set(cardId, v)
      return next
    })
  }

  async function handleSubmit() {
    // Repeat each id by its count so each copy becomes its own entry.
    const ids: string[] = []
    for (const [id, n] of counts) for (let i = 0; i < n; i++) ids.push(id)
    if (!onSubmit && ids.length === 0) return
    setSaving(true)
    try {
      if (onSubmit) {
        await onSubmit(ids) // caller navigates away — keep selection intact
      } else {
        await onAdd?.(ids)
        setCounts(new Map())
      }
    } finally {
      setSaving(false)
    }
  }

  let count = 0
  for (const n of counts.values()) count += n

  // The sticky CTA: in onSubmit mode it stays tappable at 0 selected (acts as
  // "Skip"); otherwise it's disabled until at least one card is picked.
  const ctaEnabled = (onSubmit ? count > 0 || submitEmptyLabel != null : count > 0) && !saving
  const ctaLabel =
    count > 0
      ? submitWithLabel
        ? submitWithLabel(count)
        : `Add ${count} to ${addNoun}`
      : onSubmit && submitEmptyLabel
        ? submitEmptyLabel
        : 'Select cards to add'

  const header = useMemo(
    () => (
      <View>
        <View className="px-5 pt-3">
          <View className="flex-row items-start justify-between">
            <Text className="text-ink text-[27px] leading-8 font-display-bold flex-1 pr-3" numberOfLines={2}>
              {title}
            </Text>
            {count > 0 && (
              <View className="bg-primary/10 border border-primary rounded-lg px-2.5 py-1 mt-1">
                <Text className="text-primary font-mono-bold text-xs">{count} selected</Text>
              </View>
            )}
          </View>
          {subtitle && <Text className="text-muted text-sm mt-1.5 font-display">{subtitle}</Text>}
        </View>

        {allowMultiple && (
          <Text className="text-faint text-xs px-5 pt-2 font-display">
            Tap to add a copy · long-press to remove one
          </Text>
        )}

        {/* Search */}
        <View className="px-5 pt-3">
          <View className="flex-row items-center bg-surface rounded-xl px-3.5 border border-subtle">
            <Ionicons name="search" size={16} color={colors.primary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search cards…"
              placeholderTextColor={colors.faint2}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-ink py-2.5 ml-2 text-sm font-display"
            />
          </View>
        </View>

        {/* TCG filter + Filters button */}
        <View className="flex-row items-center px-5 pt-3 gap-2">
          {GAME_OPTIONS.map((opt) => (
            <Chip key={String(opt.value)} label={opt.label} active={game === opt.value} onPress={() => setGame(opt.value)} />
          ))}
          <View className="flex-1" />
          <Pressable
            onPress={() => setFilterOpen(true)}
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg border active:opacity-70 ${activeFilters > 0 ? 'bg-primary/10 border-primary' : 'border-subtle'}`}
          >
            <Ionicons name="options-outline" size={15} color={activeFilters > 0 ? colors.primary : colors.muted2} />
            <Text className={`text-xs font-display-medium ${activeFilters > 0 ? 'text-primary' : 'text-muted-2'}`}>
              {activeFilters > 0 ? `Filters · ${activeFilters}` : 'Filters'}
            </Text>
          </Pressable>
        </View>
      </View>
    ),
    [title, count, query, game, activeFilters, allowMultiple]
  )

  return (
    <View className="flex-1 bg-bg">
      {error ? (
        <>
          {header}
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-danger text-sm text-center font-display">{error}</Text>
          </View>
        </>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(c) => c.id}
          numColumns={3}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 14, paddingTop: 8, paddingBottom: 100 }}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isAdded = addedIds?.has(item.id) ?? false
            const itemCount = counts.get(item.id) ?? 0
            return (
              <CardTile
                width={tileW}
                uri={item.image_url}
                title={item.name}
                titleClassName="text-ink font-display-semibold text-xs"
                subtitle={<Text className="text-muted text-[10px] font-mono mt-0.5" numberOfLines={1}>{item.id}</Text>}
                selected={!allowMultiple && itemCount > 0}
                count={allowMultiple ? itemCount : undefined}
                topRight={
                  isAdded ? (
                    <View className="bg-surface-control rounded px-1.5 py-0.5">
                      <Text className="text-faint-2 text-[9px] font-mono-bold tracking-wider">ON LIST</Text>
                    </View>
                  ) : undefined
                }
                onPress={isAdded ? undefined : () => tapCard(item.id)}
                onLongPress={allowMultiple && !isAdded ? () => decrementCard(item.id) : undefined}
              />
            )
          }}
          ListEmptyComponent={
            loading ? (
              <View className="items-center pt-16">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View className="items-center pt-16 px-8">
                <Text className="text-muted text-sm text-center font-display">
                  {query ? 'No cards found.' : 'No cards in the catalog yet.'}
                </Text>
              </View>
            )
          }
        />
      )}

      {/* Sticky Add bar */}
      <View
        className="absolute left-0 right-0 bottom-0 px-5 pt-3 bg-tabbar border-t border-subtle"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={!ctaEnabled}
          style={ctaEnabled ? { shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } } : undefined}
          className={`flex-row items-center justify-center py-4 rounded-2xl ${ctaEnabled ? 'bg-primary active:opacity-90' : 'bg-surface-control'}`}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryInk} />
          ) : (
            <Text className={`font-display-bold text-base ${ctaEnabled ? 'text-primary-ink' : 'text-faint'}`}>
              {ctaLabel}
            </Text>
          )}
        </Pressable>
      </View>

      <CardFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        sets={facets.sets}
        colors={facets.colors}
        cardTypes={facets.cardTypes}
        value={filters}
        onChange={setFilters}
      />
    </View>
  )
}
