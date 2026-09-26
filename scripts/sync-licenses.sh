#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

OUTPUT_FILE="$ROOT_DIR/lib/core/settings/oss_licenses.dart"

echo "🔄 [SYNC-LICENSES] Synchronizing OSS licenses..."

# Ensure FLUTTER_ROOT is resolved
if [ -z "$FLUTTER_ROOT" ]; then
  FLUTTER_BIN="$(which flutter 2>/dev/null || true)"
  if [ -n "$FLUTTER_BIN" ]; then
    export FLUTTER_ROOT="$(cd "$(dirname "$FLUTTER_BIN")/.." && pwd)"
  elif [ -d "$HOME/flutter" ]; then
    export FLUTTER_ROOT="$HOME/flutter"
  fi
fi

# Ensure $FLUTTER_ROOT/version exists for dart_pubspec_licenses
if [ -n "$FLUTTER_ROOT" ] && [ ! -f "$FLUTTER_ROOT/version" ]; then
  FLUTTER_VERSION=$("$FLUTTER_ROOT/bin/flutter" --version 2>/dev/null | grep -oE "Flutter [0-9]+\.[0-9]+\.[0-9]+" | awk '{print $2}' || echo "3.47.2")
  echo "$FLUTTER_VERSION" > "$FLUTTER_ROOT/version" 2>/dev/null || true
fi

# Run the generator targeting lib/core/settings/oss_licenses.dart
dart run dart_pubspec_licenses:generate -o "$OUTPUT_FILE" -p "$ROOT_DIR"

if git diff --name-only "$OUTPUT_FILE" 2>/dev/null | grep -q .; then
  git add "$OUTPUT_FILE"
  echo "🔄 [SYNC-LICENSES] Updated and staged $OUTPUT_FILE"
else
  echo "✅ [SYNC-LICENSES] OSS licenses are up to date ($OUTPUT_FILE)"
fi
