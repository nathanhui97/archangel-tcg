import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useCardSearch } from '@/lib/cards'
import type { Card } from '@/types'

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
}

export function CardSearch({
  onSelect,
  initialQuery = '',
  limit = 30,
  setCode = null,
  placeholder = 'Search by card name or code',
}: Props) {
  const [query, setQuery] = useState(initialQuery)
  const { results, loading, error } = useCardSearch(query, { limit, setCode })

  return (
    <View className="flex-1">
      <View className="px-4 pb-3">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          autoCapitalize="none"
          autoCorrect={false}
          className="bg-gray-900 text-white px-4 py-3 rounded-xl border border-gray-800 text-base"
        />
        <View className="h-5 mt-1">
          {loading && (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#475569" />
              <Text className="text-gray-500 text-xs ml-2">Searching…</Text>
            </View>
          )}
          {error && <Text className="text-red-400 text-xs">{error}</Text>}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-px bg-gray-900 my-2" />}
        ListEmptyComponent={
          loading ? null : (
            <View className="items-center py-10">
              <Text className="text-gray-500 text-sm">
                {query ? 'No cards found.' : 'No cards in the catalog yet.'}
              </Text>
              {!query && (
                <Text className="text-gray-600 text-xs mt-2">
                  Run the seed script to import the Gundam catalog.
                </Text>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <CardRow card={item} onPress={onSelect ? () => onSelect(item) : undefined} />
        )}
      />
    </View>
  )
}

function CardRow({ card, onPress }: { card: Card; onPress?: () => void }) {
  const content = (
    <View className="flex-row items-center bg-gray-900 rounded-xl p-3">
      {card.image_url ? (
        <Image
          source={{ uri: card.image_url }}
          className="w-12 h-16 rounded-md bg-gray-800"
          resizeMode="cover"
        />
      ) : (
        <View className="w-12 h-16 rounded-md bg-gray-800" />
      )}
      <View className="flex-1 ml-3">
        <Text numberOfLines={1} className="text-white font-semibold text-base">
          {card.name}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-gray-400 text-xs font-mono">{card.id}</Text>
          {card.set_name && (
            <Text numberOfLines={1} className="text-gray-500 text-xs ml-2 flex-1">
              · {card.set_name}
            </Text>
          )}
        </View>
        {(card.color || card.card_type || card.rarity) && (
          <View className="flex-row mt-1.5 gap-1.5">
            {card.color && <Tag>{card.color}</Tag>}
            {card.card_type && <Tag>{card.card_type}</Tag>}
            {card.rarity && <Tag>{card.rarity}</Tag>}
          </View>
        )}
      </View>
    </View>
  )

  if (!onPress) return content
  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      {content}
    </Pressable>
  )
}

function Tag({ children }: { children: string }) {
  return (
    <View className="bg-gray-800 px-2 py-0.5 rounded">
      <Text className="text-gray-300 text-[10px] font-medium uppercase tracking-wider">
        {children}
      </Text>
    </View>
  )
}
