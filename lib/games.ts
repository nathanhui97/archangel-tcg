/**
 * Central registry of games Bindar shows. `live` games are playable now;
 * `soon` games are teased (SOON badges + the coming-soon banner) but not
 * selectable until they launch. Add a game here and every surface updates.
 *
 * Note: only `live` game keys ('gundam') are valid DB `Game` values. `soon`
 * keys are display-only until their catalog + schema land.
 */
export type GameKey = 'gundam' | 'one_piece' | 'riftbound'
export type GameStatus = 'live' | 'soon'

export type GameInfo = {
  key: GameKey
  label: string // short, for chips
  fullLabel: string // full title, for the banner
  status: GameStatus
}

export const GAMES: GameInfo[] = [
  { key: 'gundam', label: 'Gundam', fullLabel: 'Gundam Card Game', status: 'live' },
  { key: 'one_piece', label: 'One Piece', fullLabel: 'One Piece Card Game', status: 'soon' },
  { key: 'riftbound', label: 'Riftbound', fullLabel: 'Riftbound: League of Legends TCG', status: 'soon' },
]

export const LIVE_GAMES = GAMES.filter((g) => g.status === 'live')
export const COMING_SOON_GAMES = GAMES.filter((g) => g.status === 'soon')
