module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    plugins: [
      // babel-preset-expo already handles class-properties / private-methods.
      // Required by react-native-reanimated v4 (which NativeWind pulls in).
      // MUST be the last plugin.
      'react-native-worklets/plugin',
    ],
  }
}
