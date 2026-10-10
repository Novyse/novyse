#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RAW_OS="$1"
OS_TARGET="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" # Convert to lowercase

show_usage() {
  echo "Usage: $0 <os> [optional flutter args...]"
  echo ""
  echo "Supported platforms:"
  echo "  - web      : flutter run -d chrome --web-port 8081"
  echo "  - linux    : flutter run -d linux --no-enable-impeller"
  echo "  - windows  : flutter run -d windows"
  echo "  - macos    : flutter run -d macos"
  echo "  - android  : flutter run -d android"
  echo "  - ios      : flutter run -d ios"
  echo ""
}

if [ -z "$1" ]; then
  echo "❌ Error: No OS specified."
  echo ""
  show_usage
  exit 1
fi

case "$OS_TARGET" in
  web|linux|windows|macos|mac|android|ios)
    ;;
  *)
    echo "❌ Error: Invalid/unrecognized OS '$RAW_OS'."
    echo ""
    show_usage
    exit 1
    ;;
esac

shift # Remove OS from arguments so subsequent arguments can be passed to flutter

# Synchronize branch and target platform configuration
PLATFORM_SYNC_TARGET="$OS_TARGET"
[ "$PLATFORM_SYNC_TARGET" = "mac" ] && PLATFORM_SYNC_TARGET="macos"
bash "$SCRIPT_DIR/sync-branch.sh"
bash "$SCRIPT_DIR/sync-platform.sh" "$PLATFORM_SYNC_TARGET"

# Run checks
bash "$SCRIPT_DIR/check/check-dependencies.sh"
bash "$SCRIPT_DIR/check/check-platform.sh" "$OS_TARGET"

case "$OS_TARGET" in
  web)
    echo "🚀 Launching on Web (Chrome, port 8081)..."
    exec flutter run -d chrome --web-port 8081 "$@"
    ;;
  linux)
    echo "🚀 Launching on Linux (no-enable-impeller)..."
    exec flutter run -d linux --no-enable-impeller "$@"
    ;;
  windows)
    echo "🚀 Launching on Windows..."
    exec flutter run -d windows "$@"
    ;;
  macos|mac)
    echo "🚀 Launching on macOS..."
    exec flutter run -d macos "$@"
    ;;
  android)
    echo "🚀 Launching on Android..."
    exec flutter run -d android "$@"
    ;;
  ios)
    echo "🚀 Launching on iOS..."
    exec flutter run -d ios "$@"
    ;;
esac
