#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$ROOT_DIR/build/windows/x64/runner/Release"

if [ ! -d "$BUNDLE_DIR" ]; then
  echo "❌ [INNO ERROR] Windows release bundle not found at: $BUNDLE_DIR"
  echo "   Run 'flutter build windows --release' first."
  exit 1
fi

# Locate Inno Setup Compiler
ISCC_CMD=""
if command -v iscc >/dev/null 2>&1; then
  ISCC_CMD="iscc"
elif command -v ISCC >/dev/null 2>&1; then
  ISCC_CMD="ISCC"
elif [ -f "/c/Program Files (x86)/Inno Setup 6/ISCC.exe" ]; then
  ISCC_CMD="/c/Program Files (x86)/Inno Setup 6/ISCC.exe"
elif [ -f "C:/Program Files (x86)/Inno Setup 6/ISCC.exe" ]; then
  ISCC_CMD="C:/Program Files (x86)/Inno Setup 6/ISCC.exe"
fi

if [ -z "$ISCC_CMD" ]; then
  echo "⚠️  [INNO WARNING] Inno Setup compiler ('iscc') not found. Skipping Windows installer."
  exit 0
fi

mkdir -p "$DIST_DIR"
INNO_TEMP="$(mktemp --suffix=.iss)"
generate_inno_setup_iss "$INNO_TEMP"

echo "📦 [INNO] Compiling Windows installer with Inno Setup..."
INNO_ARG="$INNO_TEMP"
if command -v cygpath >/dev/null 2>&1; then
  INNO_ARG="$(cygpath -w "$INNO_TEMP")"
fi
ISCC_STATUS=0
"$ISCC_CMD" "$INNO_ARG" || ISCC_STATUS=$?
rm -f "$INNO_TEMP"

if [ -f "$DIST_DIR/${WIN_SETUP_NAME}.exe" ]; then
  echo "✅ [INNO] Created: $DIST_DIR/${WIN_SETUP_NAME}.exe"
  exit 0
fi

echo "❌ [INNO ERROR] Inno Setup compilation failed (exit=$ISCC_STATUS), setup.exe not created."
echo "   Inspect the ISCC output above (e.g. 'Could not read ...' means a path in the .iss is wrong)."
exit 1
