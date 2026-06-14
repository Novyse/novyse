const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const wasmSrc = path.join(
  rootDir,
  "node_modules",
  "canvaskit-wasm",
  "bin",
  "full",
  "canvaskit.wasm",
);
const publicDir = path.join(rootDir, "public");
const destPath = path.join(publicDir, "canvaskit.wasm");

try {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, destPath);
    console.log(`[SCRIPT] Successfully copied canvaskit.wasm to ${destPath}`);
  } else {
    console.warn(`[SCRIPT] Warning: canvaskit.wasm not found at ${wasmSrc}`);
  }
} catch (error) {
  console.error("[SCRIPT] Failed to copy canvaskit.wasm:", error);
  process.exit(1);
}
