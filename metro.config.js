// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
// Add wasm asset support
config.resolver.assetExts.push("wasm");

config.resolver.alias = {
  '@': '/',
};

// Add COEP and COOP headers to support SharedArrayBuffer
config.server.enhanceMiddleware = (_metroMiddleware, _metroServer) => {
  return (_req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    return _metroMiddleware(_req, res, next);
  };
};

module.exports = config;
