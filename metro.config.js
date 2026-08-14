const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");

try {
  require("graceful-fs").gracefulify(fs);
} catch {
  // metro always depends on graceful-fs; ignore if resolution fails
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("wasm");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== "web" && moduleName === "crypto") {
    return context.resolveRequest(
      context,
      "react-native-quick-crypto",
      platform,
    );
  }

  if (moduleName === "zustand" || moduleName.startsWith("zustand/")) {
    const cjsPath = require.resolve(moduleName);
    return context.resolveRequest(context, cjsPath, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.alias = {
  "@": "/",
};

const flattenRegexList = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(flattenRegexList);
  return [value];
};

// Same flags as Expo's default blockList (none). Used as Metro file-map ignore.
// ! To enable uncomment line 49 below
const extraIgnore =
  /[\\/](desktop[\\/].*|node_modules[\\/]@hugeicons[\\/]core-free-icons[\\/]dist[\\/](esm|types)[\\/].*)$/;

config.resolver.blockList = [
  ...flattenRegexList(config.resolver.blockList),
  // extraIgnore,
];

config.watcher = {
  ...config.watcher,
  unstable_lazySha1: true,
};

// Expo defaults this to false. Without it Metro uses Node fs.watch (one
// handle per file) and EMFILE appears as soon as workers also open files.
// Watchman is a single daemon: workers can then use all cores.
config.resolver.useWatchman = true;

module.exports = config;
