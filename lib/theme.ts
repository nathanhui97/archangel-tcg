/**
 * Bindar design tokens, JS-side.
 *
 * Tailwind/NativeWind covers className styling; these constants are for the
 * handful of RN props that don't take classNames — ActivityIndicator `color`,
 * Switch `trackColor`/`thumbColor`, TextInput `placeholderTextColor`,
 * react-native-svg fills/strokes, icon colors, etc.
 *
 * Keep in sync with tailwind.config.js.
 */
export const colors = {
  bg: '#050706',
  surface: '#0E1512',
  surfaceSheet: '#0B110E',
  surfaceRaised: '#111A15',
  surfaceControl: '#141C18',
  tabbar: 'rgba(6,9,7,0.94)',

  primary: '#35F58A',
  primaryInk: '#04140C',

  ink: '#E6F2EA',
  muted: '#7B8C82',
  muted2: '#8FA399',
  dim: '#9FB3A8',
  label: '#6F8579',
  faint: '#4C5A52',
  faint2: '#5C6B62',

  track: '#2A352E',

  gold: '#C9A84A',
  amber: '#F5C24A',
  danger: '#FF6B6B',

  // borders (rgba — green-tinted hairlines)
  borderSubtle: 'rgba(120,255,180,0.14)',
  borderHair: 'rgba(120,255,180,0.08)',
  borderPrimarySoft: 'rgba(53,245,138,0.3)',

  // per-user avatar identity tints (derived deterministically from handle)
  avatarCyan: '#38E1F5',
  avatarOrange: '#FF9F6B',
  avatarPurple: '#B894FF',
} as const

/** Deterministic avatar tint from a handle, so the same user is always the same color. */
const AVATAR_TINTS = [colors.avatarCyan, colors.avatarOrange, colors.avatarPurple, colors.primary]
export function avatarTint(handle: string): string {
  let hash = 0
  for (let i = 0; i < handle.length; i++) hash = (hash * 31 + handle.charCodeAt(i)) | 0
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length]
}
