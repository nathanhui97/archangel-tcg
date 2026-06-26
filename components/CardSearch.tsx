import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCardSearch } from '@/lib/cards'
import type { Card } from '@/types'
import { CardThumb } from '@/components/ui'
import { colors } from '@/lib/theme'

type Props = {
  /** Called when the user taps a card row. */
  onSelect?: (card: Card) => void
  /** Set the initial query, e.g. for filters. */
  initialQuery?: string
  /** Cap the result count. */
  limit?: number
  /** Filter to a specific set code (e.g. "GD01"). */
  setCode?: string | null
  placeholder?: string
  /** Card ids already added — shown with a check instead of an add affordance. */
  addedIds?: Set<string>
}

export function CardSearch({
  onSelect,
  initialQuery = '',
  limit = 30,
  setCode = null,
  placeholder = 'Search by card name or code',
  addedIds,
}: Props) {
  const [query, setQuery] = useState(initialQuery)
  const { results, loading, error } = useCardSearch(query, { limit, setCode })

  return (
    <View className="flex-1">
      <View className="px-5 pb-3">
        <View className="flex-row items-center bg-surface rounded-xl px-3.5 border border-subtle">
          <Ionicons name="search" size={16} color={colors.primary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.faint2}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-ink py-3 ml-2 text-base font-display"
          />
        </View>
        <View className="h-5 mt-1">
          {loading && (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color={colors.faint2} />
              <Text className="text-faint text-xs ml-2 font-display">Searching…</Text>
            </View>
          )}
          {error && <Text className="text-danger text-xs font-display">{error}</Text>}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-px bg-surface my-2" />}
        ListEmptyComponent={
          loading ? null : (
            <View className="items-center py-10">
              <Text className="text-muted text-sm font-display">
                {query ? 'No cards found.' : 'No cards in the catalog yet.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <CardRow
            card={item}
            added={addedIds?.has(item.id) ?? false}
            onPress={onSelect ? () => onSelect(item) : undefined}
          />
        )}
      />
    </View>
  )
}

function CardRow({ card, onPress, added }: { card: Card; onPress?: () => void; added: boolean }) {
  const content = (
    <View className="flex-row items-center bg-surface border border-subtle rounded-xl p-3">
      <CardThumb uri={card.image_url} className="w-12 h-16" radius="rounded-md" />
      <View className="flex-1 ml-3">
        <Text className="text-ink font-mono-bold text-[15px]" numberOfLines={1}>
          {card.id}
        </Text>
        {card.set_name && (
          <Text numberOfLines={1} className="text-muted text-xs mt-0.5 font-display">
            {card.set_name}
          </Text>
        )}
      </View>
      {onPress && (
        <View
          className={`w-8 h-8 rounded-lg items-center justify-center ${added ? 'bg-primary/10' : 'bg-primary'}`}
        >
          <Ionicons name={added ? 'checkmark' : 'add'} size={18} color={added ? colors.primary : colors.primaryInk} />
        </View>
      )}
    </View>
  )

  if (!onPress) return content
  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      {content}
    </Pressable>
  )
}
