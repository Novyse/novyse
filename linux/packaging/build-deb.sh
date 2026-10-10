#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$ROOT_DIR/build/linux/x64/release/bundle"

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "❌ [DEB ERROR] Flutter Linux release bundle not found at: $BUNDLE_DIR"
  echo "   Run 'flutter build linux --release' first."
  exit 1
fi

mkdir -p "$DIST_DIR"

# Debian versions cannot have dashes in upstream version (convert to ~)
CLEAN_VERSION=$(echo "$APP_VERSION" | tr '-' '~')
DEB_NAME="${PKG_NAME}_${CLEAN_VERSION}_amd64.deb"
STAGING_DIR="$(mktemp -d)"

echo "📦 [DEB] Assembling Debian package structure for $APP_NAME ($PKG_NAME) in $STAGING_DIR..."

mkdir -p "$STAGING_DIR/DEBIAN"
mkdir -p "$STAGING_DIR/opt/$PKG_NAME"
mkdir -p "$STAGING_DIR/usr/bin"
mkdir -p "$STAGING_DIR/usr/share/applications"
mkdir -p "$STAGING_DIR/usr/share/metainfo"
mkdir -p "$STAGING_DIR/usr/share/icons"

# Copy binary bundle
cp -R "$BUNDLE_DIR"/* "$STAGING_DIR/opt/$PKG_NAME/"

# Symlink executable
ln -sf "/opt/$PKG_NAME/novyse" "$STAGING_DIR/usr/bin/$PKG_NAME"
if [ "$PKG_NAME" != "novyse" ]; then
  ln -sf "/opt/$PKG_NAME/novyse" "$STAGING_DIR/usr/bin/novyse" || true
fi

# Ensure desktop entry and metainfo exist
# Generate desktop entry, AppStream metainfo, and icons directly on-demand into staging directory
generate_desktop_entry "$STAGING_DIR/usr/share/applications/${APP_ID}.desktop"
generate_appstream_metainfo "$STAGING_DIR/usr/share/metainfo/${APP_ID}.metainfo.xml"
generate_linux_icons "$STAGING_DIR/usr/share/icons"

# Generate control file dynamically from global.dart
cat << EOF > "$STAGING_DIR/DEBIAN/control"
Package: $PKG_NAME
Version: $CLEAN_VERSION
Architecture: amd64
Maintainer: $AUTHOR_NAME <$AUTHOR_EMAIL>
Section: net
Priority: optional
Homepage: $AUTHOR_URL
Depends: libgtk-3-0, libsecret-1-0, libx11-6
Description: $APP_DESCRIPTION
EOF

# Build package
if command -v dpkg-deb >/dev/null 2>&1; then
  dpkg-deb --build --root-owner-group "$STAGING_DIR" "$DIST_DIR/$DEB_NAME"
  echo "✅ [DEB] Created: $DIST_DIR/$DEB_NAME"
else
  echo "⚠️  [DEB WARNING] 'dpkg-deb' is not installed. Package root saved in $STAGING_DIR"
fi

rm -rf "$STAGING_DIR"
