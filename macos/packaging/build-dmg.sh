#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"
APP_PATH=$(find "$ROOT_DIR/build/macos/Build/Products/Release" -maxdepth 1 -name "*.app" | head -n 1)

if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then
  echo "❌ [MACOS ERROR] Release .app not found in build/macos/Build/Products/Release"
  echo "   Run 'flutter build macos --release' first."
  exit 1
fi

mkdir -p "$DIST_DIR"

ZIP_NAME="${PKG_NAME}-macos.zip"
DMG_NAME="${PKG_NAME}.dmg"

echo "📦 [MACOS] Packaging $APP_NAME into zip: $DIST_DIR/$ZIP_NAME..."
ditto -c -k --sequesterRsrc --keepParent "$APP_PATH" "$DIST_DIR/$ZIP_NAME" || (cd "$(dirname "$APP_PATH")" && zip -r -y "$DIST_DIR/$ZIP_NAME" "$(basename "$APP_PATH")")

echo "📦 [MACOS] Creating DMG for $APP_NAME: $DIST_DIR/$DMG_NAME..."
if command -v create-dmg >/dev/null 2>&1; then
  create-dmg \
    --volname "$APP_NAME" \
    --window-pos 200 120 \
    --window-size 600 400 \
    --icon-size 100 \
    --icon "$APP_NAME.app" 175 120 \
    --hide-extension "$APP_NAME.app" \
    --app-drop-link 425 120 \
    "$DIST_DIR/$DMG_NAME" \
    "$APP_PATH" || true
fi

# Fallback using standard hdiutil if create-dmg is not present or failed
if [ ! -f "$DIST_DIR/$DMG_NAME" ]; then
  DMG_STAGING="$(mktemp -d)"
  cp -R "$APP_PATH" "$DMG_STAGING/"
  ln -s /Applications "$DMG_STAGING/Applications"
  hdiutil create -volname "$APP_NAME" -srcfolder "$DMG_STAGING" -ov -format UDZO "$DIST_DIR/$DMG_NAME"
  rm -rf "$DMG_STAGING"
fi

echo "✅ [MACOS] Output generated:"
echo "   - $DIST_DIR/$ZIP_NAME"
echo "   - $DIST_DIR/$DMG_NAME"
