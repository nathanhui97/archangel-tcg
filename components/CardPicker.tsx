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
  /** Noun for the add button: `Add N to ${addNoun}`. */
  addNoun?: string
  /** Cards already in the target — shown as "ON LIST" and not selectable. */
  addedIds?: Set<string>
  onAdd: (cardIds: string[]) => Promise<void>
}

/** Full-catalog multi-select card picker (Pokémon-Pocket-style "Add to …"). */
export function CardPicker({ title = 'Add cards', addNoun = 'binder', addedIds, onAdd }: Props) {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const tileW = gridTileWidth(width)

  const [query, setQuery] = useState('')
  const [game, setGame] = useState<string | null>('gundam')
  const [filters, setFilters] = useState<CardFilters>({ setCode: null, color: null, cardType: null })
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
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

  function toggle(cardId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  async function handleAdd() {
    if (selected.size === 0) return
    setSaving(true)
    try {
      await onAdd(Array.from(selected))
      setSelected(new Set())
    } finally {
      setSaving(false)
    }
  }

  const count = selected.size

  const header = useMemo(
    () => (
      <View>
        <View className="flex-row items-center justify-between px-5 pt-1">
          <Text className="text-ink text-xl font-display-bold" numberOfLines={1}>
            {title}
          </Text>
          {count > 0 && (
            <View className="bg-primary/10 border border-primary rounded-lg px-2.5 py-1">
              <Text className="text-primary font-mono-bold text-xs">{count} selected</Text>
            </View>
          )}
        </View>

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
    [title, count, query, game, activeFilters]
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
            return (
              <CardTile
                width={tileW}
                uri={item.image_url}
                title={item.id}
                subtitle={item.name}
                selected={selected.has(item.id)}
                topRight={
                  isAdded ? (
                    <View className="bg-surface-control rounded px-1.5 py-0.5">
                      <Text className="text-faint-2 text-[9px] font-mono-bold tracking-wider">ON LIST</Text>
                    </View>
                  ) : undefined
                }
                onPress={isAdded ? undefined : () => toggle(item.id)}
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
          onPress={handleAdd}
          disabled={count === 0 || saving}
          style={count > 0 && !saving ? { shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } } : undefined}
          className={`flex-row items-center justify-center py-4 rounded-2xl ${count > 0 && !saving ? 'bg-primary active:opacity-90' : 'bg-surface-control'}`}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryInk} />
          ) : (
            <Text className={`font-display-bold text-base ${count > 0 ? 'text-primary-ink' : 'text-faint'}`}>
              {count > 0 ? `Add ${count} to ${addNoun}` : 'Select cards to add'}
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
