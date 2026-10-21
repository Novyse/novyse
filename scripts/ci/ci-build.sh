#!/usr/bin/env bash
# Shared CI build entrypoint, used by both release.yml and release-test.yml.
#
# Usage: bash scripts/ci/ci-build.sh <os>
#   <os>: android | linux | windows | macos | web | ios
#
# Env (all optional unless noted):
#   GOOGLE_SERVICES_B64     base64 google-services.json (android)
#   ANDROID_KEYSTORE_B64    base64 release keystore (android)
#   ANDROID_KEYSTORE_FILE   keystore path (default: <repo>/novyse-release.keystore)
#   ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_ALIAS / ANDROID_KEY_PASSWORD
#
# Produces distributables in dist/ and prints the resulting file list.
set -e

OS="${1:?Usage: ci-build.sh <os: android|linux|windows|macos|web|ios>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/scripts/extract-metadata.sh"

if [ -n "${PKG_NAME:-}" ] && [ -n "${APP_VERSION:-}" ]; then
  ANDROID_BASE="${PKG_NAME}-${APP_VERSION}-android"
else
  ANDROID_BASE="novyse"
fi

build_android() {
  echo "🤖 [CI-BUILD] Android..."

  if [ -n "${GOOGLE_SERVICES_B64:-}" ]; then
    echo "$GOOGLE_SERVICES_B64" | base64 --decode > android/app/google-services.json
  fi
  KEYSTORE_FILE="${ANDROID_KEYSTORE_FILE:-$ROOT_DIR/novyse-release.keystore}"
  if [ -n "${ANDROID_KEYSTORE_B64:-}" ]; then
    echo "$ANDROID_KEYSTORE_B64" | base64 --decode > "$KEYSTORE_FILE"
  fi

  flutter pub get
  bash "$ROOT_DIR/scripts/sync-licenses.sh"
  bash "$ROOT_DIR/scripts/sync-platform.sh"

  flutter build apk --release
  flutter build apk --release --split-per-abi
  flutter build appbundle --release

  mkdir -p dist
  find build/app/outputs/bundle -name "*.aab" 2>/dev/null | while read -r aab_path; do
    cp "$aab_path" "dist/${ANDROID_BASE}.aab"
  done
  if [ -f build/app/outputs/flutter-apk/app-release.apk ]; then
    cp build/app/outputs/flutter-apk/app-release.apk "dist/${ANDROID_BASE}-universal.apk"
  fi
  find build/app/outputs/flutter-apk -name "app-*-release.apk" 2>/dev/null | while read -r apk_path; do
    abi=$(basename "$apk_path" | sed -E 's/app-(.*)-release\.apk/\1/')
    cp "$apk_path" "dist/${ANDROID_BASE}-${abi}.apk"
  done

  if [ -f "$KEYSTORE_FILE" ] && [ -n "${ANDROID_KEYSTORE_PASSWORD:-}" ] && [ -n "${ANDROID_KEY_ALIAS:-}" ]; then
    echo "🔑 [CI-BUILD] Exporting public certificate (.pem)..."
    keytool -exportcert -rfc \
      -keystore "$KEYSTORE_FILE" \
      -alias "$ANDROID_KEY_ALIAS" \
      -storepass "$ANDROID_KEYSTORE_PASSWORD" \
      -file dist/novyse-release-cert.pem || true
  fi
}

case "$OS" in
  android)
    build_android
    ;;
  linux | windows | macos | web | ios)
    flutter pub get
    bash "$ROOT_DIR/scripts/sync-licenses.sh"
    bash "$ROOT_DIR/scripts/build.sh" "$OS"
    ;;
  *)
    echo "❌ [CI-BUILD] Unknown OS '$OS'. Expected: android|linux|windows|macos|web|ios"
    exit 1
    ;;
esac

echo ""
echo "📦 [CI-BUILD] Artifacts in dist/:"
ls -la dist/ 2>/dev/null || echo "(empty)"
if [ ! -d dist ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then
  echo "📦 [CI-BUILD] Compiled products:"
  find build -maxdepth 4 \( -name "*.app" -o -name "*.exe" \) 2>/dev/null | head -20 || true
fi
