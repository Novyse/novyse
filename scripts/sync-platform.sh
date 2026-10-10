#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

TARGET_PLATFORM="${1:-all}"
TARGET_PLATFORM="${TARGET_PLATFORM,,}"

echo "🔄 [SYNC-PLATFORM] Synchronizing for $APP_NAME ($APP_ID) v$APP_VERSION [$BRANCH] (Target: $TARGET_PLATFORM)..."
echo "   Copyright: $COPYRIGHT (Year: $CURRENT_YEAR)"

PLATFORM_DIR="$SCRIPT_DIR/platform"

case "$TARGET_PLATFORM" in
  linux)
    bash "$PLATFORM_DIR/linux.sh"
    ;;
  windows)
    bash "$PLATFORM_DIR/windows.sh"
    ;;
  macos)
    bash "$PLATFORM_DIR/macos.sh"
    ;;
  ios)
    bash "$PLATFORM_DIR/ios.sh"
    ;;
  android)
    bash "$PLATFORM_DIR/android.sh"
    ;;
  web)
    bash "$PLATFORM_DIR/web.sh"
    ;;
  all)
    bash "$PLATFORM_DIR/linux.sh"
    bash "$PLATFORM_DIR/windows.sh"
    bash "$PLATFORM_DIR/macos.sh"
    bash "$PLATFORM_DIR/ios.sh"
    bash "$PLATFORM_DIR/android.sh"
    bash "$PLATFORM_DIR/web.sh"
    ;;
  *)
    echo "❌ [SYNC-PLATFORM ERROR] Unknown platform '$TARGET_PLATFORM'."
    echo "   Supported targets: linux, windows, macos, ios, android, web, all"
    exit 1
    ;;
esac

echo "✅ [SYNC-PLATFORM] Completed successfully!"
