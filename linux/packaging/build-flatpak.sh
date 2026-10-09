#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$ROOT_DIR/build/linux/x64/release/bundle"

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "❌ [FLATPAK ERROR] Flutter Linux release bundle not found at: $BUNDLE_DIR"
  exit 1
fi

if ! command -v flatpak-builder >/dev/null 2>&1; then
  echo "⚠️  [FLATPAK WARNING] 'flatpak-builder' not installed. Skipping Flatpak package."
  exit 0
fi

mkdir -p "$DIST_DIR"
STAGING_DIR="$(mktemp -d)"

# Stage components needed by flatpak-builder
cp -R "$BUNDLE_DIR" "$STAGING_DIR/bundle"
generate_desktop_entry "$STAGING_DIR/${APP_ID}.desktop"
generate_appstream_metainfo "$STAGING_DIR/${APP_ID}.metainfo.xml"
generate_linux_icons "$STAGING_DIR/icons"

generate_flatpak_manifest "$STAGING_DIR/${APP_ID}.yml" "."

FLATPAK_NAME="${PKG_NAME}-${APP_VERSION}.flatpak"
(cd "$STAGING_DIR" && flatpak-builder --force-clean --repo="$STAGING_DIR/repo" build_dir "${APP_ID}.yml" && flatpak build-bundle "$STAGING_DIR/repo" "$DIST_DIR/$FLATPAK_NAME" "${APP_ID}") 2>/dev/null || true
rm -rf "$STAGING_DIR"

if [ -f "$DIST_DIR/$FLATPAK_NAME" ]; then
  echo "✅ [FLATPAK] Created: $DIST_DIR/$FLATPAK_NAME"
fi
