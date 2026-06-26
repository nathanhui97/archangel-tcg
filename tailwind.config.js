/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Bindar — "tactical radar" theme (phosphor green on near-black) ──
        bg: '#050706', // app background / phone body
        surface: '#0E1512', // inputs, cards, list rows, segmented track
        'surface-sheet': '#0B110E', // bottom sheets, toasts, banners
        'surface-raised': '#111A15', // card-image tile background
        'surface-control': '#141C18', // stepper buttons, incoming bubbles, pills
        'tabbar': 'rgba(6,9,7,0.94)', // tab bar / sticky action bars

        // phosphor green accent
        primary: {
          DEFAULT: '#35F58A',
          ink: '#04140C', // text/icons ON green
        },

        // text ramp
        ink: '#E6F2EA', // primary text / headings
        muted: '#7B8C82', // secondary body
        'muted-2': '#8FA399', // tertiary labels, handles
        dim: '#9FB3A8', // dim mono text
        'label': '#6F8579', // uppercase mono section labels
        faint: '#4C5A52', // fine print / disabled
        'faint-2': '#5C6B62', // inactive tabs, placeholders

        track: '#2A352E', // toggle off-track, empty meter bars

        // semantic accents (used sparingly, single-purpose)
        gold: '#C9A84A', // Foil ONLY
        amber: '#F5C24A', // Pending ONLY
        danger: '#FF6B6B', // destructive ONLY
      },
      borderColor: {
        subtle: 'rgba(120,255,180,0.14)', // default 1px borders
        hair: 'rgba(120,255,180,0.08)', // list dividers
        'primary-soft': 'rgba(53,245,138,0.3)', // soft green borders
      },
      fontFamily: {
        // Space Grotesk — prose, headings, button labels
        display: ['SpaceGrotesk_400Regular'],
        'display-medium': ['SpaceGrotesk_500Medium'],
        'display-semibold': ['SpaceGrotesk_600SemiBold'],
        'display-bold': ['SpaceGrotesk_700Bold'],
        // JetBrains Mono — codes, numbers, distances, uppercase labels
        mono: ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
        'mono-bold': ['JetBrainsMono_700Bold'],
      },
      borderRadius: {
        phone: '44px',
      },
    },
  },
  plugins: [],
}
