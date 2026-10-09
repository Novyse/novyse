#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$ROOT_DIR/build/linux/x64/release/bundle"

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "❌ [TARBALL ERROR] Flutter Linux release bundle not found at: $BUNDLE_DIR"
  echo "   Run 'flutter build linux --release' first."
  exit 1
fi

mkdir -p "$DIST_DIR"

TAR_NAME="${PKG_NAME}-${APP_VERSION}-linux-x64.tar.gz"
STAGING_DIR="$(mktemp -d)"

echo "📦 [TARBALL] Creating Linux portable tarball for $APP_NAME ($PKG_NAME)..."
cp -R "$BUNDLE_DIR" "$STAGING_DIR/$PKG_NAME"

# Generate Desktop entry and metainfo directly on-demand into portable staging directory
generate_desktop_entry "$STAGING_DIR/$PKG_NAME/${APP_ID}.desktop"
generate_appstream_metainfo "$STAGING_DIR/$PKG_NAME/${APP_ID}.metainfo.xml"

# Icon
cp "$ROOT_DIR/assets/images/logo-novyse.png" "$STAGING_DIR/$PKG_NAME/icon.png"

tar -czf "$DIST_DIR/$TAR_NAME" -C "$STAGING_DIR" "$PKG_NAME"
rm -rf "$STAGING_DIR"

echo "✅ [TARBALL] Created: $DIST_DIR/$TAR_NAME"
