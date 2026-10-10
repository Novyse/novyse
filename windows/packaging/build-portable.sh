#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$ROOT_DIR/build/windows/x64/runner/Release"

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "❌ [PORTABLE ERROR] Windows release bundle not found at: $BUNDLE_DIR"
  echo "   Run 'flutter build windows --release' first."
  exit 1
fi

PORTABLE_NAME="${PKG_NAME}-portable.exe"
OUTPUT_EXE="$DIST_DIR/$PORTABLE_NAME"

mkdir -p "$DIST_DIR"

# Locate 7z
SEVENZIP_CMD=""
if command -v 7z >/dev/null 2>&1; then
  SEVENZIP_CMD="7z"
elif command -v 7za >/dev/null 2>&1; then
  SEVENZIP_CMD="7za"
elif [ -f "/c/Program Files/7-Zip/7z.exe" ]; then
  SEVENZIP_CMD="/c/Program Files/7-Zip/7z.exe"
elif [ -f "C:/Program Files/7-Zip/7z.exe" ]; then
  SEVENZIP_CMD="C:/Program Files/7-Zip/7z.exe"
fi

if [ -z "$SEVENZIP_CMD" ]; then
  echo "⚠️  [PORTABLE WARNING] '7z' not found. Skipping Windows portable executable."
  exit 0
fi

# Locate 7z.sfx module
SFX_BIN=""
for cand in \
  "/c/Program Files/7-Zip/7z.sfx" \
  "C:/Program Files/7-Zip/7z.sfx" \
  "/usr/lib/p7zip/7z.sfx" \
  "/usr/lib/7-zip/7z.sfx" \
  "$(dirname "$(command -v 7z 2>/dev/null || echo "")")/7z.sfx"; do
  if [ -f "$cand" ]; then
    SFX_BIN="$cand"
    break
  fi
done

echo "📦 [PORTABLE] Building Windows Portable executable: $OUTPUT_EXE..."
STAGING_DIR="$(mktemp -d)"

if [ -n "$SFX_BIN" ] && [ -f "$SFX_BIN" ]; then
  cat << EOF > "$STAGING_DIR/config.txt"
;!@Install@!utf-8!
Title="${APP_NAME}"
RunProgram="novyse.exe"
;!@InstallEnd@!
EOF
  (cd "$BUNDLE_DIR" && "$SEVENZIP_CMD" a -r -mx=9 "$STAGING_DIR/app.7z" . >/dev/null 2>&1)
  cat "$SFX_BIN" "$STAGING_DIR/config.txt" "$STAGING_DIR/app.7z" > "$OUTPUT_EXE"
  chmod +x "$OUTPUT_EXE" 2>/dev/null || true
else
  # Fallback to standard 7z self-extractor
  (cd "$BUNDLE_DIR" && "$SEVENZIP_CMD" a -sfx "$OUTPUT_EXE" . >/dev/null 2>&1) || true
fi

rm -rf "$STAGING_DIR"

if [ -f "$OUTPUT_EXE" ]; then
  echo "✅ [PORTABLE] Created: $OUTPUT_EXE"
fi
