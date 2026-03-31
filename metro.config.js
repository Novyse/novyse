// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
// Add wasm asset support
config.resolver.assetExts.push("wasm");

// Crypto polyfill for mobile (used in cloudflare-opaque)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== "web" && moduleName === "crypto") {
    // when importing crypto, resolve to react-native-quick-crypto
    return context.resolveRequest(
      context,
      "react-native-quick-crypto",
      platform,
    );
  }
  // otherwise chain to the standard Metro resolver.
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.alias = {
  "@": "/",
};

// Add COEP and COOP headers to support SharedArrayBuffer
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    middleware(req, res, next);
  };
};

module.exports = config;
