// Metro configuration for the BuilderHQ mobile app inside the pnpm
// monorepo.
//
// Two pieces of monorepo plumbing on top of Expo's default config:
//
//   1. `watchFolders` — point Metro at the workspace root so file
//      changes in shared code (and dependency reinstalls at the root)
//      get picked up by the bundler.
//
//   2. `nodeModulesPaths` — Metro's default resolver only walks the
//      package-local `node_modules`. In a pnpm workspace, transitive
//      deps like `react-native-css-interop` get hoisted to the
//      workspace-root `node_modules/`. Without this list Metro fails
//      to resolve them and throws errors like:
//
//        Unable to resolve module react-native-css-interop/jsx-runtime
//
// `unstable_enableSymlinks` is on because pnpm uses symlinks even in
// the hoisted layout — Metro skipped them by default in older versions
// and would silently fail to follow workspace package boundaries.
//
// NativeWind's `withNativeWind` wraps the final config last so its CSS
// pipeline runs after our resolver tweaks.

const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so changes propagate.
config.watchFolders = [workspaceRoot];

// Resolve modules from this package, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Follow pnpm's symlinks instead of giving up at them.
config.resolver.unstable_enableSymlinks = true;
// Don't let Metro accidentally pull a hoisted copy of a package that
// also ships its own internal node_modules — this stops the duplicate-
// React / duplicate-Reanimated class of monorepo bugs.
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: "./global.css" });
