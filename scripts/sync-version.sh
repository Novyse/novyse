#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GLOBAL_DART="$ROOT_DIR/lib/core/config/global.dart"
PUBSPEC="$ROOT_DIR/pubspec.yaml"

if [ ! -f "$GLOBAL_DART" ]; then
  echo "❌ [SYNC ERROR] Configuration file not found: $GLOBAL_DART" >&2
  exit 1
fi

# Extract appVersion directly from global.dart (strict, no fallback)
APP_VERSION=$(sed -n "s/.*const[[:space:]]\+String[[:space:]]\+appVersion[[:space:]]*=[[:space:]]*['\"]\([^'\"]\+\)['\"].*/\1/p" "$GLOBAL_DART" | head -n 1)

if [ -z "$APP_VERSION" ]; then
  echo "❌ [SYNC ERROR] 'const String appVersion' must be defined in $GLOBAL_DART" >&2
  exit 1
fi

if [ ! -f "$PUBSPEC" ]; then
  echo "❌ [SYNC ERROR] pubspec.yaml not found at: $PUBSPEC" >&2
  exit 1
fi

# Extract existing build suffix (+...) if present, otherwise default to +1
BUILD_SUFFIX=$(sed -n "s/^version:[[:space:]]*[^+]*\(+.*\)/\1/p" "$PUBSPEC" | head -n 1)
if [ -z "$BUILD_SUFFIX" ]; then
  BUILD_SUFFIX="+1"
fi

NEW_VERSION="version: ${APP_VERSION}${BUILD_SUFFIX}"

CURRENT_VERSION=$(grep "^version:" "$PUBSPEC" | head -n 1)

if [ "$CURRENT_VERSION" = "$NEW_VERSION" ]; then
  echo "✅ [SYNC] pubspec.yaml is already up to date ($NEW_VERSION)"
else
  sed -i "s/^version:.*/${NEW_VERSION}/" "$PUBSPEC"
  echo "🔄 [SYNC] Updated pubspec.yaml to: $NEW_VERSION"
fi
