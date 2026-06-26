import { ReactNode, useEffect } from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withRepeat,
  withTiming,
  cancelAnimation,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated'
import { colors } from '@/lib/theme'

const SPRING = { damping: 18, stiffness: 220, mass: 0.6 }
const BADGE_HIT = 34 // top-left square (px) that counts as a tap on the delete badge

/** Pixel slot (top-left) for an item at a given index in an N-column grid. */
function slotXY(index: number, columns: number, tileW: number, tileH: number, gap: number) {
  'worklet'
  const row = Math.floor(index / columns)
  const col = index % columns
  return { x: col * (tileW + gap), y: row * (tileH + gap) }
}

/** Return a new id→index map with the item at `from` moved to `to`, shifting the rest. */
function objectMove(positions: Record<string, number>, from: number, to: number) {
  'worklet'
  const next: Record<string, number> = {}
  for (const id in positions) {
    const p = positions[id]
    if (p === from) next[id] = to
    else if (from < to && p > from && p <= to) next[id] = p - 1
    else if (from > to && p >= to && p < from) next[id] = p + 1
    else next[id] = p
  }
  return next
}

function buildPositions(ids: string[]): Record<string, number> {
  const m: Record<string, number> = {}
  ids.forEach((id, i) => (m[id] = i))
  return m
}

type Positions = SharedValue<Record<string, number>>

type TileProps = {
  id: string
  indexFallback: number
  ids: string[]
  positions: Positions
  count: number
  columns: number
  tileWidth: number
  tileHeight: number
  gap: number
  editing: boolean
  onReorder: (orderedIds: string[]) => void
  onRequestEdit?: () => void
  onDelete?: () => void
  children: ReactNode
}

function MovableTile({
  id, indexFallback, ids, positions, count, columns, tileWidth, tileHeight, gap,
  editing, onReorder, onRequestEdit, onDelete, children,
}: TileProps) {
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const isActive = useSharedValue(false)
  const wiggle = useSharedValue(0)

  const home = slotXY(positions.value[id] ?? indexFallback, columns, tileWidth, tileHeight, gap)
  const tx = useSharedValue(home.x)
  const ty = useSharedValue(home.y)

  // iPhone-style jiggle while in edit mode, desynced per tile so they don't move in lockstep.
  useEffect(() => {
    if (editing) {
      const dir = indexFallback % 2 === 0 ? 1 : -1
      const amp = 0.7
      wiggle.value = dir * amp
      wiggle.value = withRepeat(
        withTiming(-dir * amp, { duration: 170 + (indexFallback % 4) * 16 }),
        -1,
        true
      )
    } else {
      cancelAnimation(wiggle)
      wiggle.value = withTiming(0, { duration: 90 })
    }
  }, [editing, indexFallback, wiggle])

  useAnimatedReaction(
    () => positions.value[id],
    (now, prev) => {
      if (now != null && now !== prev && !isActive.value) {
        const p = slotXY(now, columns, tileWidth, tileHeight, gap)
        tx.value = withSpring(p.x, SPRING)
        ty.value = withSpring(p.y, SPRING)
      }
    }
  )

  // Drag-to-reorder. In edit mode it picks up on a short movement; otherwise it
  // needs a long press first (so a stray touch doesn't drag).
  const pan = Gesture.Pan()
    .enabled(editing)
    .minDistance(8)
    .onStart(() => {
      const p = slotXY(positions.value[id], columns, tileWidth, tileHeight, gap)
      startX.value = p.x
      startY.value = p.y
      isActive.value = true
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX
      ty.value = startY.value + e.translationY

      const centerX = tx.value + tileWidth / 2
      const centerY = ty.value + tileHeight / 2
      let col = Math.floor(centerX / (tileWidth + gap))
      let row = Math.floor(centerY / (tileHeight + gap))
      if (col < 0) col = 0
      if (col > columns - 1) col = columns - 1
      const maxRow = Math.floor((count - 1) / columns)
      if (row < 0) row = 0
      if (row > maxRow) row = maxRow
      let newIndex = row * columns + col
      if (newIndex > count - 1) newIndex = count - 1
      if (newIndex < 0) newIndex = 0

      if (newIndex !== positions.value[id]) {
        positions.value = objectMove(positions.value, positions.value[id], newIndex)
      }
    })
    .onFinalize(() => {
      if (!isActive.value) return
      isActive.value = false
      const p = slotXY(positions.value[id], columns, tileWidth, tileHeight, gap)
      tx.value = withSpring(p.x, SPRING)
      ty.value = withSpring(p.y, SPRING)
      const order: string[] = []
      for (let i = 0; i < ids.length; i++) order[positions.value[ids[i]]] = ids[i]
      runOnJS(onReorder)(order)
    })

  // In edit mode, a tap on the top-left badge deletes; elsewhere does nothing.
  const tapDelete = Gesture.Tap()
    .enabled(editing)
    .maxDuration(250)
    .onEnd((e) => {
      if (onDelete && e.x <= BADGE_HIT && e.y <= BADGE_HIT) runOnJS(onDelete)()
    })

  // Out of edit mode, a long press enters edit mode (the iPhone "hold to jiggle").
  const longPress = Gesture.LongPress()
    .enabled(!editing)
    .minDuration(220)
    .onStart(() => {
      if (onRequestEdit) runOnJS(onRequestEdit)()
    })

  const gesture = Gesture.Exclusive(pan, tapDelete, longPress)

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: tileWidth,
    height: tileHeight,
    zIndex: isActive.value ? 50 : 0,
    opacity: isActive.value ? 0.96 : 1,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotateZ: `${wiggle.value}deg` },
      { scale: withSpring(isActive.value ? 1.06 : 1, SPRING) },
    ],
    shadowColor: '#35F58A',
    shadowOpacity: isActive.value ? 0.55 : 0,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  }))

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style}>
        {children}
        {editing && onDelete ? (
          <View
            pointerEvents="none"
            className="absolute top-1 left-1 w-[22px] h-[22px] rounded-full bg-ink items-center justify-center"
            style={{ shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}
          >
            <Ionicons name="close" size={15} color={colors.bg} />
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  )
}

type Props<T extends { id: string }> = {
  items: T[]
  renderItem: (item: T) => ReactNode
  tileWidth: number
  tileHeight: number
  /** Persist the new order. Receives all item ids in their new order. */
  onReorder: (orderedIds: string[]) => void
  /** Edit (jiggle) mode: tiles wiggle, show a delete badge, and drag immediately. */
  editing?: boolean
  /** Called when a long-press should enter edit mode. */
  onRequestEdit?: () => void
  /** Called when the delete badge on an item is tapped. */
  onDeleteItem?: (item: T) => void
  columns?: number
  gap?: number
}

/**
 * A grid of cards. Long-press enters iPhone-style edit mode: tiles jiggle and
 * show a delete badge; in edit mode you drag to reorder and tap the badge to
 * delete. Built on gesture-handler + reanimated — no new deps.
 *
 * Note: no auto-scroll while dragging — drag within the visible area, scroll, then
 * drag again to move a card a long way. Fine for typical binder sizes.
 */
export function DraggableCardGrid<T extends { id: string }>({
  items, renderItem, tileWidth, tileHeight, onReorder, editing = false, onRequestEdit, onDeleteItem, columns = 3, gap = 10,
}: Props<T>) {
  const ids = items.map((i) => i.id)
  const positions = useSharedValue<Record<string, number>>(buildPositions(ids))

  const idsKey = ids.join(',')
  useEffect(() => {
    positions.value = buildPositions(idsKey ? idsKey.split(',') : [])
  }, [idsKey, positions])

  const rows = Math.ceil(items.length / columns)
  const containerHeight = rows > 0 ? rows * (tileHeight + gap) - gap : 0

  return (
    <View style={{ height: containerHeight, width: '100%' }}>
      {items.map((item, index) => (
        <MovableTile
          key={item.id}
          id={item.id}
          indexFallback={index}
          ids={ids}
          positions={positions}
          count={items.length}
          columns={columns}
          tileWidth={tileWidth}
          tileHeight={tileHeight}
          gap={gap}
          editing={editing}
          onReorder={onReorder}
          onRequestEdit={onRequestEdit}
          onDelete={onDeleteItem ? () => onDeleteItem(item) : undefined}
        >
          {renderItem(item)}
        </MovableTile>
      ))}
    </View>
  )
}
