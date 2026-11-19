#!/usr/bin/env bash
# Single entrypoint for composing the launcher icons.
#
# Sources (hand-made, versioned): assets/images/icons/ (glyphs),
# assets/images/icons_backgrounds/ (plates), assets/images/tray_icon.png and
# assets/images/novyse-icon-logo.png. Outputs (generated, NOT versioned):
# assets/images/icons/generated/, the Android mipmaps/aliases, the desktop ICOs
# and the iOS alternate AppIcon sets. See tool/gen_launcher_icons.dart.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# `dart` is not on PATH inside Xcode build phases, so prefer the SDK copy
# cached by Flutter (same lookup as the CMake build).
DART_BIN=""
if [ -n "${FLUTTER_ROOT:-}" ]; then
  for candidate in \
    "$FLUTTER_ROOT/bin/cache/dart-sdk/bin/dart" \
    "$FLUTTER_ROOT/bin/cache/dart-sdk/bin/dart.exe"; do
    if [ -x "$candidate" ]; then
      DART_BIN="$candidate"
      break
    fi
  done
fi
if [ -z "$DART_BIN" ]; then
  DART_BIN="$(command -v dart || true)"
fi
if [ -z "$DART_BIN" ]; then
  echo "❌ [ICONS] dart not found: set FLUTTER_ROOT or add it to PATH" >&2
  exit 1
fi

# `image` is a dev dependency: the resolved package config must exist.
if [ ! -f ".dart_tool/package_config.json" ]; then
  flutter pub get
fi

exec "$DART_BIN" tool/gen_launcher_icons.dart
