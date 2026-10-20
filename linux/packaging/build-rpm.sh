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
RPM_NAME="${PKG_NAME}-${APP_VERSION}-linux.rpm"
STAGING_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGING_DIR"' EXIT

mkdir -p "$STAGING_DIR"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}
PAYLOAD_DIR="$STAGING_DIR/payload"
mkdir -p "$PAYLOAD_DIR/opt/$PKG_NAME"
mkdir -p "$PAYLOAD_DIR/usr/bin"
mkdir -p "$PAYLOAD_DIR/usr/share/applications"
mkdir -p "$PAYLOAD_DIR/usr/share/metainfo"
mkdir -p "$PAYLOAD_DIR/usr/share/icons"

cp -R "$BUNDLE_DIR"/* "$PAYLOAD_DIR/opt/$PKG_NAME/"
ln -sf "/opt/$PKG_NAME/novyse" "$PAYLOAD_DIR/usr/bin/$PKG_NAME"

generate_desktop_entry "$PAYLOAD_DIR/usr/share/applications/${APP_ID}.desktop"
generate_appstream_metainfo "$PAYLOAD_DIR/usr/share/metainfo/${APP_ID}.metainfo.xml"
generate_linux_icons "$PAYLOAD_DIR/usr/share/icons"

cat << EOF > "$STAGING_DIR/SPECS/${PKG_NAME}.spec"
%global __brp_check_rpaths %{nil}

Name:           $PKG_NAME
Version:        $CLEAN_VERSION
Release:        1
Summary:        $APP_DESCRIPTION
License:        $PROJECT_LICENSE
URL:            $AUTHOR_URL
Packager:       $AUTHOR_NAME <$AUTHOR_EMAIL>
Vendor:         $AUTHOR_NAME
BuildArch:      x86_64
AutoReqProv:    no

%description
$APP_DESCRIPTION

%install
cp -a "$PAYLOAD_DIR"/. %{buildroot}/

%files
/opt/$PKG_NAME
/usr/bin/$PKG_NAME
/usr/share/applications/${APP_ID}.desktop
/usr/share/metainfo/${APP_ID}.metainfo.xml
/usr/share/icons/*

EOF

RPMBUILD_LOG="$STAGING_DIR/rpmbuild.log"
if ! rpmbuild --define "_topdir $STAGING_DIR" -bb "$STAGING_DIR/SPECS/${PKG_NAME}.spec" >"$RPMBUILD_LOG" 2>&1; then
  echo "⚠️  [RPM WARNING] rpmbuild failed:"
  tail -n 30 "$RPMBUILD_LOG"
fi

BUILT_RPM=$(find "$STAGING_DIR/RPMS" -name "*.rpm" | head -n 1)
if [ -n "$BUILT_RPM" ]; then
  cp "$BUILT_RPM" "$DIST_DIR/$RPM_NAME" 2>/dev/null || true
fi

if [ -f "$DIST_DIR/$RPM_NAME" ]; then
  echo "✅ [RPM] Created: $DIST_DIR/$RPM_NAME"
else
  echo "⚠️  [RPM WARNING] No RPM package was produced."
fi
