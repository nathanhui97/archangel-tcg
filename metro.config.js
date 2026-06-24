const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Inject our polyfills BEFORE Metro's default polyfills and any user code.
// This ensures DOMException (and friends) exist before RN's env setup runs.
const defaultPolyfills = config.serializer?.getPolyfills?.({ platform: 'web' }) ?? []
const originalGetPolyfills = config.serializer?.getPolyfills

config.serializer = {
  ...config.serializer,
  getPolyfills: (opts) => {
    const base = originalGetPolyfills ? originalGetPolyfills(opts) : defaultPolyfills
    return [path.resolve(__dirname, 'polyfills.js'), ...base]
  },
}

module.exports = withNativeWind(config, { input: './global.css' })
