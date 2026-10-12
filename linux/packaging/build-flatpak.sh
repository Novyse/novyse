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
generate_desktop_entry "$STAGING_DIR/${FLATHUB_APP_ID}.desktop" "$FLATHUB_APP_ID"
generate_appstream_metainfo "$STAGING_DIR/${FLATHUB_APP_ID}.metainfo.xml" "$FLATHUB_APP_ID"
generate_linux_icons "$STAGING_DIR/icons" "$FLATHUB_APP_ID"

generate_flatpak_manifest "$STAGING_DIR/${FLATHUB_APP_ID}.yml" "."

FLATPAK_NAME="${PKG_NAME}-${APP_VERSION}-linux.flatpak"
if (cd "$STAGING_DIR" && flatpak-builder --force-clean --repo="$STAGING_DIR/repo" build_dir "${FLATHUB_APP_ID}.yml" && flatpak build-bundle "$STAGING_DIR/repo" "$DIST_DIR/$FLATPAK_NAME" "${FLATHUB_APP_ID}"); then
  echo "✅ [FLATPAK] Created: $DIST_DIR/$FLATPAK_NAME"
else
  echo "⚠️  [FLATPAK WARNING] flatpak-builder failed (see output above). Skipping Flatpak package."
fi
rm -rf "$STAGING_DIR"
