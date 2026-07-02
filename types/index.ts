export type Game = 'gundam' | 'one_piece'
export type Condition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
export type BinderType = 'collection' | 'trade'

export const GAME_LABELS: Record<Game, string> = {
  gundam: 'Gundam Card Game',
  one_piece: 'One Piece Card Game',
}

export interface Profile {
  id: string
  handle: string
  games: Game[]
  lat: number | null
  lng: number | null
  city: string | null
  willing_to_ship: boolean
  verified_at: string | null       // trader ✓ badge (migration 0024); set by review only
  created_at: string
}

export interface NearbyCard {
  card_id: string
  card_name: string
  card_image_url: string | null
  card_game: Game
  card_set_code: string | null
  card_number: string | null
  binder_item_id: string
  quantity: number
  condition: Condition
  is_foil: boolean
  owner_id: string
  owner_handle: string
  owner_willing_to_ship: boolean
  distance_km: number | null  // null = shipper with no location set
  // Enriched client-side from `cards` (see lib/nearby.ts) for filtering.
  card_rarity?: string | null
  card_color?: string | null
  card_type?: string | null
  card_is_alt_art?: boolean
}

export type CardType =
  // Gundam
  | 'Unit' | 'Pilot' | 'Command' | 'Base' | 'Resource'
  // One Piece
  | 'Leader' | 'Character' | 'Event' | 'Stage' | 'DON!!'

export interface Card {
  id: string                       // full unique code: "GD01-001" or "OP01-001_p1"
  game: Game
  name: string
  set_name: string | null
  set_code: string | null          // "GD01" / "OP01"
  number: string | null            // "001"
  art_variant: string | null       // null for base print; "p1" / "p2" for alt arts
  base_card_id: string | null      // "GD01-001" — same for all prints of a card
  is_alt_art: boolean              // derived: art_variant is not null (migration 0022)
  rarity_rank: number              // derived: higher = rarer, for display sort (migration 0022)
  tcgplayer_product_id: number | null // TCGplayer product for price lookup (migration 0023)
  card_type: CardType | null

  // Shared
  color: string | null             // single ("Red") or dual ("Red/Green") for One Piece
  rarity: string | null
  cost: number | null
  effect: string | null
  trait: string[] | null
  source_title: string | null

  // Gundam-only
  level: number | null
  ap: number | null
  hp: number | null
  link: string | null
  zone: string | null

  // One Piece-only
  power: number | null             // attack value (1000-10000 scale)
  counter: number | null           // defensive value
  life: number | null              // Leader life total
  attribute: string | null         // Special / Strike / Slash / Ranged / Wisdom
  block: string | null             // rotation marker

  image_url: string | null
}

export interface Binder {
  id: string
  user_id: string
  name: string
  binder_type: BinderType
  is_public: boolean
  cover_card_id: string | null
  verified_at: string | null       // photo-verified badge (migration 0024)
  created_at: string
  updated_at: string
}

export interface NearbyBinder {
  binder_id: string
  name: string
  cover_image_url: string | null
  item_count: number
  owner_id: string
  owner_handle: string
  owner_verified_at: string | null
  owner_willing_to_ship: boolean
  binder_verified_at: string | null
  distance_km: number | null
  total_value: number | null
}

// ── Social: the Pull Feed (migration 0024) ──────────────────────────────
export type ReactionKind = 'fire' | 'heart' | 'want'
export type PullVisibility = 'public' | 'private'

export interface Pull {
  id: string
  user_id: string
  card_id: string
  binder_item_id: string | null
  photo_path: string | null        // path in the public 'pull-photos' bucket
  caption: string | null
  is_pull: boolean                 // framed as a fresh pull vs just sharing a card
  visibility: PullVisibility
  verified_at: string | null       // ✓ set by the founder review script only
  created_at: string
}

export interface PullReaction {
  id: string
  pull_id: string
  user_id: string
  kind: ReactionKind
  created_at: string
}

export type VerificationStatus = 'pending' | 'approved' | 'rejected'

export interface BinderVerification {
  id: string
  binder_id: string
  user_id: string
  photo_paths: string[]
  note: string | null
  status: VerificationStatus
  submitted_at: string
  reviewed_at: string | null
}

export interface NearbyWantlistItem {
  card_id: string
  card_name: string
  card_image_url: string | null
  card_game: Game
  card_set_code: string | null
  card_number: string | null
  wanter_id: string
  wanter_handle: string
  distance_km: number | null
  // Enriched client-side from `cards` (see lib/nearby.ts) for filtering.
  card_rarity?: string | null
  card_color?: string | null
  card_type?: string | null
  card_is_alt_art?: boolean
}

export interface BinderItem {
  id: string
  binder_id: string
  card_id: string
  quantity: number
  condition: Condition
  is_foil: boolean
  position: number
  photo_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  card?: Card
}

export interface WantlistItem {
  id: string
  user_id: string
  card_id: string
  notes: string | null
  created_at: string
  updated_at: string
  card?: Card
}

export type TradeStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'

export interface Trade {
  id: string
  requester_id: string
  recipient_id: string
  status: TradeStatus
  about_card_id: string | null
  requester_read_at: string
  recipient_read_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  trade_id: string
  sender_id: string
  body: string
  kind: 'text' | 'proposal' | 'inquiry'
  proposal_id: string | null
  card_id: string | null
  created_at: string
}

export type ProposalStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'
export type ProposalSide = 'give' | 'get'

export interface TradeProposal {
  id: string
  trade_id: string
  proposer_id: string
  status: ProposalStatus
  cash_cents: number
  created_at: string
}

export interface TradeProposalItem {
  id: string
  proposal_id: string
  side: ProposalSide
  card_id: string
  quantity: number
  condition: Condition
  is_foil: boolean
}
