export type Game = 'gundam'
export type Condition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'

export interface Profile {
  id: string
  handle: string
  games: Game[]
  lat: number | null
  lng: number | null
  created_at: string
}

export interface Card {
  id: string
  game: Game
  name: string
  set_name: string | null
  set_code: string | null
  number: string | null
  card_type: string | null
  color: string | null
  rarity: string | null
  cost: number | null
  level: number | null
  ap: number | null
  hp: number | null
  link: string | null
  zone: string | null
  trait: string[] | null
  effect: string | null
  source_title: string | null
  image_url: string | null
}

export interface Binder {
  id: string
  user_id: string
  name: string
  is_public: boolean
  created_at: string
}

export interface BinderItem {
  id: string
  binder_id: string
  card_id: string
  quantity: number
  condition: Condition
  is_foil: boolean
  photo_url: string | null
  card?: Card
}

export interface WantlistItem {
  id: string
  user_id: string
  card_id: string
  card?: Card
}

export interface Conversation {
  id: string
  user_a: string
  user_b: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}
