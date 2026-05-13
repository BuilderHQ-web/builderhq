// Metro configuration — NativeWind requires the CSS pipeline so we wrap
// the default Expo config with `withNativeWind`. Inputs `global.css` and
// keeps Metro's tree-shaking + asset resolution intact.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
