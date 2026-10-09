#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$ROOT_DIR/build/linux/x64/release/bundle"

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "❌ [SNAP ERROR] Flutter Linux release bundle not found at: $BUNDLE_DIR"
  exit 1
fi

if ! command -v snapcraft >/dev/null 2>&1; then
  echo "⚠️  [SNAP WARNING] 'snapcraft' not installed. Skipping Snap package."
  exit 0
fi

mkdir -p "$DIST_DIR"
STAGING_DIR="$(mktemp -d)"
mkdir -p "$STAGING_DIR/snap/gui"

# Stage binary bundle
cp -R "$BUNDLE_DIR" "$STAGING_DIR/bundle"

# Stage desktop entry and icon for Snapcraft
generate_desktop_entry "$STAGING_DIR/snap/gui/${PKG_NAME}.desktop"
if [ -f "$ROOT_DIR/assets/images/logo-novyse-512.png" ]; then
  cp "$ROOT_DIR/assets/images/logo-novyse-512.png" "$STAGING_DIR/snap/gui/${PKG_NAME}.png"
elif [ -f "$ROOT_DIR/assets/images/logo-novyse.png" ]; then
  cp "$ROOT_DIR/assets/images/logo-novyse.png" "$STAGING_DIR/snap/gui/${PKG_NAME}.png"
fi

generate_snapcraft_yaml "$STAGING_DIR/snap/snapcraft.yaml" "bundle"

SNAP_NAME="${PKG_NAME}_${APP_VERSION}_amd64.snap"
(cd "$STAGING_DIR" && snapcraft pack --output "$DIST_DIR/$SNAP_NAME") 2>/dev/null || true
rm -rf "$STAGING_DIR"

if [ -f "$DIST_DIR/$SNAP_NAME" ]; then
  echo "✅ [SNAP] Created: $DIST_DIR/$SNAP_NAME"
fi
