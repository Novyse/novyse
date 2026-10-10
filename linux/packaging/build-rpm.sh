#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$ROOT_DIR/build/linux/x64/release/bundle"

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "❌ [RPM ERROR] Flutter Linux release bundle not found at: $BUNDLE_DIR"
  exit 1
fi

if ! command -v rpmbuild >/dev/null 2>&1; then
  echo "⚠️  [RPM WARNING] 'rpmbuild' not installed. Skipping RPM package."
  exit 0
fi

mkdir -p "$DIST_DIR"
CLEAN_VERSION=$(echo "$APP_VERSION" | tr '-' '.')
RPM_NAME="${PKG_NAME}.rpm"
STAGING_DIR="$(mktemp -d)"

mkdir -p "$STAGING_DIR"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}
mkdir -p "$STAGING_DIR/BUILDROOT/${PKG_NAME}-${CLEAN_VERSION}-1.x86_64"
ROOT="$STAGING_DIR/BUILDROOT/${PKG_NAME}-${CLEAN_VERSION}-1.x86_64"

mkdir -p "$ROOT/opt/$PKG_NAME"
mkdir -p "$ROOT/usr/bin"
mkdir -p "$ROOT/usr/share/applications"
mkdir -p "$ROOT/usr/share/metainfo"
mkdir -p "$ROOT/usr/share/icons"

cp -R "$BUNDLE_DIR"/* "$ROOT/opt/$PKG_NAME/"
ln -sf "/opt/$PKG_NAME/novyse" "$ROOT/usr/bin/$PKG_NAME"

generate_desktop_entry "$ROOT/usr/share/applications/${APP_ID}.desktop"
generate_appstream_metainfo "$ROOT/usr/share/metainfo/${APP_ID}.metainfo.xml"
generate_linux_icons "$ROOT/usr/share/icons"

cat << EOF > "$STAGING_DIR/SPECS/${PKG_NAME}.spec"
Name:           $PKG_NAME
Version:        $CLEAN_VERSION
Release:        1
Summary:        $APP_DESCRIPTION
License:        $PROJECT_LICENSE
URL:            $AUTHOR_URL
AutoReqProv:    no

%description
$APP_DESCRIPTION

%files
/opt/$PKG_NAME
/usr/bin/$PKG_NAME
/usr/share/applications/${APP_ID}.desktop
/usr/share/metainfo/${APP_ID}.metainfo.xml
/usr/share/icons/*

EOF

rpmbuild --define "_topdir $STAGING_DIR" -bb "$STAGING_DIR/SPECS/${PKG_NAME}.spec" >/dev/null 2>&1 || true

BUILT_RPM=$(find "$STAGING_DIR/RPMS" -name "*.rpm" | head -n 1)
if [ -n "$BUILT_RPM" ]; then
  cp "$BUILT_RPM" "$DIST_DIR/$RPM_NAME" 2>/dev/null || true
fi
rm -rf "$STAGING_DIR"

if [ -f "$DIST_DIR/$RPM_NAME" ]; then
  echo "✅ [RPM] Created: $DIST_DIR/$RPM_NAME"
fi
