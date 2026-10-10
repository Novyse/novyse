#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$ROOT_DIR/build/windows/x64/runner/Release"

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "❌ [MSI ERROR] Windows release bundle not found at: $BUNDLE_DIR"
  echo "   Run 'flutter build windows --release' first."
  exit 1
fi

MSI_NAME="${INSTALLER_NAME}.msi"
OUTPUT_MSI="$DIST_DIR/$MSI_NAME"
mkdir -p "$DIST_DIR"

# Locate WiX v3 tools
CANDLE_CMD=""
LIGHT_CMD=""
HEAT_CMD=""

if command -v candle >/dev/null 2>&1; then
  CANDLE_CMD="candle"
  LIGHT_CMD="light"
  HEAT_CMD="heat"
elif [ -f "/c/Program Files (x86)/WiX Toolset v3.11/bin/candle.exe" ]; then
  CANDLE_CMD="/c/Program Files (x86)/WiX Toolset v3.11/bin/candle.exe"
  LIGHT_CMD="/c/Program Files (x86)/WiX Toolset v3.11/bin/light.exe"
  HEAT_CMD="/c/Program Files (x86)/WiX Toolset v3.11/bin/heat.exe"
elif [ -f "C:/Program Files (x86)/WiX Toolset v3.11/bin/candle.exe" ]; then
  CANDLE_CMD="C:/Program Files (x86)/WiX Toolset v3.11/bin/candle.exe"
  LIGHT_CMD="C:/Program Files (x86)/WiX Toolset v3.11/bin/light.exe"
  HEAT_CMD="C:/Program Files (x86)/WiX Toolset v3.11/bin/heat.exe"
fi

if [ -n "$CANDLE_CMD" ] && [ -n "$LIGHT_CMD" ] && [ -n "$HEAT_CMD" ]; then
  echo "📦 [MSI] Building MSI installer with WiX Toolset..."
  STAGING_DIR="$(mktemp -d)"
  generate_wix_wxs "$STAGING_DIR/novyse.wxs"

  # Harvest directory
  "$HEAT_CMD" dir "$BUNDLE_DIR" -cg NovyseComponents -dr INSTALLFOLDER -scom -sreg -srd -var var.SourceDir -gg -out "$STAGING_DIR/NovyseFiles.wxs" >/dev/null 2>&1 || true

  # Compile
  "$CANDLE_CMD" -arch x64 -dSourceDir="$BUNDLE_DIR" "$STAGING_DIR/novyse.wxs" "$STAGING_DIR/NovyseFiles.wxs" -out "$STAGING_DIR/" >/dev/null 2>&1 || true

  # Link
  "$LIGHT_CMD" "$STAGING_DIR/novyse.wixobj" "$STAGING_DIR/NovyseFiles.wixobj" -out "$OUTPUT_MSI" -ext WixUIExtension >/dev/null 2>&1 || \
  "$LIGHT_CMD" "$STAGING_DIR/novyse.wixobj" "$STAGING_DIR/NovyseFiles.wixobj" -out "$OUTPUT_MSI" >/dev/null 2>&1 || true

  rm -rf "$STAGING_DIR"

  if [ -f "$OUTPUT_MSI" ]; then
    echo "✅ [MSI] Created: $OUTPUT_MSI"
  fi
  exit 0
fi

# Check for WiX v4
if command -v wix >/dev/null 2>&1; then
  echo "📦 [MSI] Building MSI installer with WiX v4..."
  STAGING_DIR="$(mktemp -d)"
  generate_wix_wxs "$STAGING_DIR/novyse.wxs"
  wix build "$STAGING_DIR/novyse.wxs" -o "$OUTPUT_MSI" 2>/dev/null || true
  rm -rf "$STAGING_DIR"

  if [ -f "$OUTPUT_MSI" ]; then
    echo "✅ [MSI] Created: $OUTPUT_MSI"
  fi
  exit 0
fi

# Check for wixl (msitools on Linux)
if command -v wixl >/dev/null 2>&1; then
  echo "📦 [MSI] Building MSI installer with wixl..."
  STAGING_DIR="$(mktemp -d)"
  generate_wix_wxs "$STAGING_DIR/novyse.wxs"
  wixl -o "$OUTPUT_MSI" "$STAGING_DIR/novyse.wxs" 2>/dev/null || true
  rm -rf "$STAGING_DIR"

  if [ -f "$OUTPUT_MSI" ]; then
    echo "✅ [MSI] Created: $OUTPUT_MSI"
  fi
  exit 0
fi

echo "⚠️  [MSI WARNING] WiX Toolset ('candle'/'light'/'heat') not found. Skipping MSI package."
