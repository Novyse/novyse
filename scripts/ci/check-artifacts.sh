#!/usr/bin/env bash
# Checks whether all expected distributables for <os> already exist in the
# GitHub release v<version>. Prints `true` (skip build) or `false` (build).
#
# Usage: bash scripts/ci/check-artifacts.sh <os> <version> <channel>
#   <os>:      android | linux | windows | macos | web
#   <version>: e.g. 1.3.0-20261011.0 (without leading `v`)
#   <channel>: production | preview
#
# Requires `gh` authenticated (GITHUB_TOKEN) when run in CI.
set -e

OS="${1:?Usage: check-artifacts.sh <os> <version> <channel>}"
VERSION="${2:?Usage: check-artifacts.sh <os> <version> <channel>}"
CHANNEL="${3:?Usage: check-artifacts.sh <os> <version> <channel>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/scripts/extract-metadata.sh"

SUFFIX=""
if [ "$CHANNEL" = "preview" ]; then
  SUFFIX="-preview"
fi

expected=()
case "$OS" in
  android)
    expected+=("novyse${SUFFIX}-universal.apk")
    for abi in armeabi-v7a arm64-v8a x86_64; do
      expected+=("novyse${SUFFIX}-${abi}.apk")
    done
    if [ "$CHANNEL" = "production" ]; then
      expected+=("novyse${SUFFIX}.aab")
    fi
    ;;
  linux)
    expected+=("${PKG_NAME}.tar.gz" "${PKG_NAME}.deb" "${PKG_NAME}.AppImage" \
      "${PKG_NAME}.rpm" "${PKG_NAME}.snap" "${PKG_NAME}.flatpak")
    ;;
  windows)
    expected+=("${PKG_NAME}-setup.exe" "${PKG_NAME}-portable.exe" "${PKG_NAME}-setup.msi")
    ;;
  macos)
    expected+=("${PKG_NAME}-macos.zip" "${PKG_NAME}.dmg")
    ;;
  web)
    expected+=("novyse${SUFFIX}-web.zip")
    ;;
  *)
    echo "❌ [CHECK-ARTIFACTS] Unknown OS '$OS'." >&2
    echo "false"
    exit 0
    ;;
esac

HAVE=""
if HAVE=$(gh release view "v${VERSION}" --json assets --jq '.assets[].name' 2>/dev/null); then
  :
else
  # No such release (or API error): nothing can be skipped.
  echo "false"
  exit 0
fi

for f in "${expected[@]}"; do
  if ! printf '%s\n' "$HAVE" | grep -qxF "$f"; then
    echo "false"
    exit 0
  fi
done

echo "true"
