#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$ROOT_DIR/build/linux/x64/release/bundle"

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "❌ [APPIMAGE ERROR] Flutter Linux release bundle not found at: $BUNDLE_DIR"
  echo "   Run 'flutter build linux --release' first."
  exit 1
fi

mkdir -p "$DIST_DIR"

APPIMAGE_NAME="${APP_NAME}-${APP_VERSION}-x86_64.AppImage"
APPDIR="$(mktemp -d)/${APP_NAME}.AppDir"

echo "📦 [APPIMAGE] Creating AppDir for $APP_NAME at: $APPDIR"
mkdir -p "$APPDIR/usr/bin"
mkdir -p "$APPDIR/usr/lib"
mkdir -p "$APPDIR/usr/share/applications"
mkdir -p "$APPDIR/usr/share/metainfo"
mkdir -p "$APPDIR/usr/share/icons"

# Copy bundle
cp -R "$BUNDLE_DIR"/* "$APPDIR/usr/bin/"
if [ -d "$BUNDLE_DIR/lib" ]; then
  cp -R "$BUNDLE_DIR/lib"/* "$APPDIR/usr/lib/" || true
fi

# Generate Desktop entry and metainfo directly on-demand into AppDir
generate_desktop_entry "$APPDIR/usr/share/applications/${APP_ID}.desktop"
generate_desktop_entry "$APPDIR/${APP_ID}.desktop"
generate_appstream_metainfo "$APPDIR/usr/share/metainfo/${APP_ID}.metainfo.xml"

# Generate icons on-demand
generate_linux_icons "$APPDIR/usr/share/icons"

cp "$ROOT_DIR/assets/images/logo-novyse-512.png" "$APPDIR/.DirIcon"
cp "$ROOT_DIR/assets/images/logo-novyse-512.png" "$APPDIR/${APP_ID}.png"

# Create AppRun
cat << 'EOF' > "$APPDIR/AppRun"
#!/bin/sh
SELF=$(readlink -f "$0")
HERE=${SELF%/*}
export PATH="${HERE}/usr/bin:${PATH}"
export LD_LIBRARY_PATH="${HERE}/usr/lib:${HERE}/usr/bin/lib:${LD_LIBRARY_PATH}"
export XDG_DATA_DIRS="${HERE}/usr/share:${XDG_DATA_DIRS}"
exec "${HERE}/usr/bin/novyse" "$@"
EOF
chmod +x "$APPDIR/AppRun"

# Check for appimagetool
APPIMAGETOOL=""
if command -v appimagetool >/dev/null 2>&1; then
  APPIMAGETOOL="appimagetool"
elif [ -f "$ROOT_DIR/.cache/appimagetool" ]; then
  APPIMAGETOOL="$ROOT_DIR/.cache/appimagetool"
else
  echo "📥 [APPIMAGE] Downloading appimagetool to cache..."
  mkdir -p "$ROOT_DIR/.cache"
  curl -sLo "$ROOT_DIR/.cache/appimagetool" "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage" || true
  chmod +x "$ROOT_DIR/.cache/appimagetool" || true
  if [ -x "$ROOT_DIR/.cache/appimagetool" ]; then
    APPIMAGETOOL="$ROOT_DIR/.cache/appimagetool"
  fi
fi

if [ -n "$APPIMAGETOOL" ]; then
  echo "🚀 [APPIMAGE] Building AppImage..."
  export APPIMAGE_EXTRACT_AND_RUN=1
  ARCH=x86_64 "$APPIMAGETOOL" "$APPDIR" "$DIST_DIR/$APPIMAGE_NAME" 2>/dev/null || ARCH=x86_64 "$APPIMAGETOOL" --appimage-extract-and-run "$APPDIR" "$DIST_DIR/$APPIMAGE_NAME" 2>/dev/null || true
  if [ -f "$DIST_DIR/$APPIMAGE_NAME" ]; then
    echo "✅ [APPIMAGE] Generated: $DIST_DIR/$APPIMAGE_NAME"
  fi
else
  echo "⚠️  [APPIMAGE WARNING] appimagetool not found. AppDir preserved at: $APPDIR"
fi

rm -rf "$APPDIR"
