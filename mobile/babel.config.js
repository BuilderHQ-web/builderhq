// Babel — Expo default + the NativeWind JSX preset so `className` works
// on every React Native component without manually wrapping them.
//
// Reanimated's plugin MUST come last (it transforms worklets, and any
// preset that runs after it will break the worklet detection).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-worklets/plugin"],
  };
};
