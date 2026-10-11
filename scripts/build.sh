#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

DIST_DIR="$ROOT_DIR/dist"

# Portable lowercase helper
to_lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

# Portable "contains word" check: case " $list " in *" $word "*) ...
list_contains() {
  case " $1 " in
    *" $2 "*) return 0 ;;
    *) return 1 ;;
  esac
}

# Platform to formats compatibility map
compat_formats() {
  case "$1" in
    linux) echo "tarball deb appimage rpm snap flatpak" ;;
    windows) echo "exe portable msi" ;;
    macos) echo "zip dmg" ;;
    android) echo "apk aab" ;;
    ios) echo "xcarchive ipa" ;;
    web) echo "zip" ;;
    *) echo "" ;;
  esac
}

ALL_PLATFORMS="linux windows macos android ios web"

show_usage() {
  echo "Usage: $0 <platform> [options]"
  echo ""
  echo "Supported platforms and compatible formats:"
  echo "  - linux    : tarball, deb, appimage, rpm, snap, flatpak"
  echo "  - windows  : exe, portable, msi"
  echo "  - macos    : zip, dmg"
  echo "  - android  : apk, aab"
  echo "  - ios      : xcarchive, ipa"
  echo "  - web      : zip"
  echo "  - all      : builds all host-supported platforms"
  echo ""
  echo "Format selection options:"
  echo "  --format=<fmt>     : Build only specified format (e.g., --format=deb)"
  echo "  --formats=<list>   : Comma-separated list of formats (e.g., --formats=deb,appimage)"
  echo ""
  echo "Platform-specific options:"
  echo "  --apk              : (Android) Shortcut to build APK only"
  echo "  --aab              : (Android) Shortcut to build App Bundle (AAB) only"
  echo "  --split-per-abi    : (Android APK) Build separate APKs per CPU architecture"
  echo ""
  echo "General options:"
  echo "  --release          : Build in release mode (default)"
  echo "  --debug            : Build in debug mode"
  echo "  --profile          : Build in profile mode"
  echo "  --clean            : Run 'flutter clean && flutter pub get' before building"
  echo "  --skip-packaging   : Compile Flutter binaries only without packaging"
  echo ""
}

if [ -z "$1" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ] || [ "$1" = "help" ]; then
  show_usage
  exit 0
fi

PLATFORM="$(to_lower "$1")"
shift

BUILD_MODE="release"
CLEAN_BUILD=0
SPLIT_PER_ABI=0
SKIP_PACKAGING=0
SELECTED_FORMATS=()

normalize_format() {
  local fmt
  fmt="$(to_lower "$1")"
  case "$fmt" in
    tar) echo "tarball" ;;
    setup|installer|inno) echo "exe" ;;
    portable) echo "portable" ;;
    msi) echo "msi" ;;
    bundle) echo "aab" ;;
    archive|ipa) echo "xcarchive" ;;
    pwa|web) echo "zip" ;;
    *) echo "$fmt" ;;
  esac
}

add_format() {
  local raw_fmt="$1"
  local norm_fmt
  norm_fmt=$(normalize_format "$raw_fmt")
  SELECTED_FORMATS+=("$norm_fmt")
}

is_format_selected() {
  local check_fmt
  check_fmt=$(normalize_format "$1")

  if [ ${#SELECTED_FORMATS[@]} -eq 0 ]; then
    return 0 # Default: build all formats
  fi

  for f in "${SELECTED_FORMATS[@]}"; do
    if [ "$f" = "$check_fmt" ]; then
      return 0
    fi
  done
  return 1
}

# Parse CLI arguments
while [ $# -gt 0 ]; do
  case "$1" in
    --release) BUILD_MODE="release" ;;
    --debug) BUILD_MODE="debug" ;;
    --profile) BUILD_MODE="profile" ;;
    --clean) CLEAN_BUILD=1 ;;
    --skip-packaging) SKIP_PACKAGING=1 ;;
    --split-per-abi) SPLIT_PER_ABI=1 ;;
    --apk)
      if [ "$PLATFORM" != "android" ] && [ "$PLATFORM" != "all" ]; then
        echo "❌ [COMPATIBILITY ERROR] Option '--apk' is only compatible with platform 'android'."
        exit 1
      fi
      add_format "apk"
      ;;
    --aab)
      if [ "$PLATFORM" != "android" ] && [ "$PLATFORM" != "all" ]; then
        echo "❌ [COMPATIBILITY ERROR] Option '--aab' is only compatible with platform 'android'."
        exit 1
      fi
      add_format "aab"
      ;;
    --format=*)
      add_format "${1#*=}"
      ;;
    --format)
      shift
      add_format "$1"
      ;;
    --formats=*)
      IFS=',' read -ra FMTS <<< "${1#*=}"
      for f in "${FMTS[@]}"; do
        [ -n "$f" ] && add_format "$f"
      done
      ;;
    --formats)
      shift
      IFS=',' read -ra FMTS <<< "$1"
      for f in "${FMTS[@]}"; do
        [ -n "$f" ] && add_format "$f"
      done
      ;;
    *)
      echo "⚠️  Unknown option: $1"
      ;;
  esac
  shift
done

# Validate platform and format compatibility
validate_compatibility() {
  # 1. Validate platform
  if [ "$PLATFORM" != "all" ] && [ -z "$(compat_formats "$PLATFORM")" ]; then
    echo "❌ [COMPATIBILITY ERROR] Unknown platform '$PLATFORM'."
    echo "   Supported platforms: linux, windows, macos, android, ios, web, all"
    exit 1
  fi

  # 2. Validate selected formats against platform compatibility array
  if [ ${#SELECTED_FORMATS[@]} -gt 0 ]; then
    for fmt in "${SELECTED_FORMATS[@]}"; do
      if [ "$PLATFORM" = "all" ]; then
        local found=0
        for p in $ALL_PLATFORMS; do
          if list_contains "$(compat_formats "$p")" "$fmt"; then
            found=1
            break
          fi
        done
        if [ "$found" -eq 0 ]; then
          echo "❌ [COMPATIBILITY ERROR] Format '$fmt' is not recognized across any platform."
          exit 1
        fi
      else
        local valid_list
        valid_list="$(compat_formats "$PLATFORM")"
        if ! list_contains "$valid_list" "$fmt"; then
          echo "❌ [COMPATIBILITY ERROR] Format '$fmt' is not compatible with platform '$PLATFORM'."
          echo "   Compatible formats for '$PLATFORM': $valid_list"
          exit 1
        fi
      fi
    done
  fi

  # 3. Validate flag compatibility
  if [ "$SPLIT_PER_ABI" -eq 1 ]; then
    if [ "$PLATFORM" != "android" ] && [ "$PLATFORM" != "all" ]; then
      echo "❌ [COMPATIBILITY ERROR] Option '--split-per-abi' is only compatible with platform 'android'."
      exit 1
    fi
    if ! is_format_selected "apk"; then
      echo "❌ [COMPATIBILITY ERROR] Option '--split-per-abi' requires format 'apk' to be enabled."
      exit 1
    fi
  fi
}

validate_compatibility

cd "$ROOT_DIR"
mkdir -p "$DIST_DIR"

# 1. Synchronize branch metadata (pubspec name & description)
bash "$SCRIPT_DIR/sync-branch.sh"

# 2. Synchronize version in pubspec.yaml
bash "$SCRIPT_DIR/sync-version.sh"

# 3. Synchronize target platform configurations
if [ "$PLATFORM" = "all" ]; then
  bash "$SCRIPT_DIR/sync-platform.sh" all
else
  bash "$SCRIPT_DIR/sync-platform.sh" "$PLATFORM"
fi

# Re-source metadata in case sync updated any configuration
source "$ROOT_DIR/scripts/extract-metadata.sh"

# 4. Check dependencies
bash "$SCRIPT_DIR/check/check-dependencies.sh"

if [ "$CLEAN_BUILD" -eq 1 ]; then
  echo "🧹 Cleaning previous build artifacts..."
  flutter clean
  flutter pub get
fi

build_linux() {
  echo "🐧 Building Linux ($BUILD_MODE) for $APP_NAME..."
  flutter build linux "--$BUILD_MODE"

  if [ "$SKIP_PACKAGING" -eq 0 ] && [ "$BUILD_MODE" = "release" ]; then
    echo "📦 Packaging Linux distributables..."
    if is_format_selected "tarball"; then
      bash "$ROOT_DIR/linux/packaging/build-tarball.sh" || true
    fi
    if is_format_selected "deb"; then
      bash "$ROOT_DIR/linux/packaging/build-deb.sh" || true
    fi
    if is_format_selected "appimage"; then
      bash "$ROOT_DIR/linux/packaging/build-appimage.sh" || true
    fi
    if is_format_selected "rpm"; then
      bash "$ROOT_DIR/linux/packaging/build-rpm.sh" || true
    fi
    if is_format_selected "snap"; then
      bash "$ROOT_DIR/linux/packaging/build-snap.sh" || true
    fi
    if is_format_selected "flatpak"; then
      bash "$ROOT_DIR/linux/packaging/build-flatpak.sh" || true
    fi
  fi
}

build_windows() {
  echo "🪟 Building Windows ($BUILD_MODE) for $APP_NAME..."
  flutter build windows "--$BUILD_MODE"

  if [ "$SKIP_PACKAGING" -eq 0 ] && [ "$BUILD_MODE" = "release" ]; then
    echo "📦 Packaging Windows distributables..."
    if is_format_selected "exe"; then
      if ! bash "$ROOT_DIR/windows/packaging/build-inno.sh"; then
        echo "⚠️  [WINDOWS WARNING] Inno Setup packaging failed; continuing with other formats."
      fi
    fi
    if is_format_selected "portable"; then
      bash "$ROOT_DIR/windows/packaging/build-portable.sh" || true
    fi
    if is_format_selected "msi"; then
      bash "$ROOT_DIR/windows/packaging/build-msi.sh" || true
    fi
  fi
}

build_macos() {
  echo "🍏 Building macOS ($BUILD_MODE) for $APP_NAME..."
  flutter build macos "--$BUILD_MODE"

  if [ "$SKIP_PACKAGING" -eq 0 ] && [ "$BUILD_MODE" = "release" ]; then
    echo "📦 Packaging macOS distributables..."
    if is_format_selected "zip"; then
      APP_PATH=$(find "$ROOT_DIR/build/macos/Build/Products/Release" -maxdepth 1 -name "*.app" | head -n 1)
      if [ -n "$APP_PATH" ] && [ -d "$APP_PATH" ]; then
        (cd "$(dirname "$APP_PATH")" && zip -r -y -q "$DIST_DIR/${PKG_NAME}-macos.zip" "$(basename "$APP_PATH")") || true
        if [ -f "$DIST_DIR/${PKG_NAME}-macos.zip" ]; then
          echo "✅ [MACOS] Created: $DIST_DIR/${PKG_NAME}-macos.zip"
        else
          echo "⚠️  [MACOS WARNING] Failed to create $DIST_DIR/${PKG_NAME}-macos.zip"
        fi
      fi
    fi
    if is_format_selected "dmg"; then
      bash "$ROOT_DIR/macos/packaging/build-dmg.sh" || true
    fi
  fi
}

build_android() {
  echo "🤖 Building Android ($BUILD_MODE) for $APP_NAME ($APP_ID)..."

  if is_format_selected "apk"; then
    if [ "$SPLIT_PER_ABI" -eq 1 ]; then
      echo "  📲 Building APKs (split per ABI)..."
      flutter build apk "--$BUILD_MODE" --split-per-abi
    else
      echo "  📲 Building universal APK..."
      flutter build apk "--$BUILD_MODE"
    fi

    # Copy APKs to dist/ with clean channel-aware names:
    # novyse-universal.apk / novyse-preview-universal.apk / novyse-dev-universal.apk (+ -<abi> for split builds)
    find "$ROOT_DIR/build/app/outputs/flutter-apk" -maxdepth 1 -name "*.apk" 2>/dev/null | while read -r apk_file; do
      apk_base=$(basename "$apk_file")
      if [ "$apk_base" = "app-release.apk" ]; then
        cp "$apk_file" "$DIST_DIR/${PKG_NAME}-universal.apk"
        echo "✅ [ANDROID] Copied APK: $DIST_DIR/${PKG_NAME}-universal.apk"
      else
        abi=$(basename "$apk_file" | sed -E 's/app-(.*)-release\.apk/\1/')
        cp "$apk_file" "$DIST_DIR/${PKG_NAME}-${abi}.apk"
        echo "✅ [ANDROID] Copied APK: $DIST_DIR/${PKG_NAME}-${abi}.apk"
      fi
    done
  fi

  if is_format_selected "aab"; then
    echo "  📦 Building App Bundle (AAB)..."
    flutter build appbundle "--$BUILD_MODE"
    find "$ROOT_DIR/build/app/outputs/bundle/release" -maxdepth 1 -name "*.aab" 2>/dev/null | while read -r aab_file; do
      cp "$aab_file" "$DIST_DIR/${PKG_NAME}.aab"
      echo "✅ [ANDROID] Copied AAB: $DIST_DIR/${PKG_NAME}.aab"
    done
  fi

  local keystore_file="${ANDROID_KEYSTORE_FILE:-$ROOT_DIR/novyse-release.keystore}"
  if [ -f "$keystore_file" ] && [ -n "$ANDROID_KEYSTORE_PASSWORD" ] && [ -n "$ANDROID_KEY_ALIAS" ]; then
    echo "🔑 Exporting Android release signing public certificate & fingerprints..."
    keytool -exportcert -rfc -keystore "$keystore_file" -alias "$ANDROID_KEY_ALIAS" -storepass "$ANDROID_KEYSTORE_PASSWORD" -file "$DIST_DIR/novyse-release-cert.pem" 2>/dev/null || true
    keytool -list -v -keystore "$keystore_file" -alias "$ANDROID_KEY_ALIAS" -storepass "$ANDROID_KEYSTORE_PASSWORD" > "$DIST_DIR/novyse-release-fingerprints.txt" 2>/dev/null || true
  fi
}

build_ios() {
  echo "📱 Building iOS ($BUILD_MODE) for $APP_NAME ($APP_ID)..."
  flutter build ipa "--$BUILD_MODE" --no-codesign
  find "$ROOT_DIR/build/ios/archive" -name "*.xcarchive" 2>/dev/null | while read -r archive_file; do
    (cd "$(dirname "$archive_file")" && zip -r -q "$DIST_DIR/${PKG_NAME}-ios.xcarchive.zip" "$(basename "$archive_file")") || true
  done
}

build_web() {
  echo "🌐 Building Web ($BUILD_MODE) for $APP_NAME..."
  flutter build web "--$BUILD_MODE"

  # Copy public static assets (e.g., .well-known/assetlinks.json) if present
  if [ -d "$ROOT_DIR/public" ]; then
    echo "  📄 Copying public/ static assets into build/web/..."
    cp -R "$ROOT_DIR/public"/* "$ROOT_DIR/build/web/" 2>/dev/null || true
  fi

  if is_format_selected "zip"; then
    if [ -d "$ROOT_DIR/build/web" ]; then
      (cd "$ROOT_DIR/build/web" && zip -r -q "$DIST_DIR/${PKG_NAME}-web.zip" .)
      echo "✅ [WEB] Created: $DIST_DIR/${PKG_NAME}-web.zip"
    fi
  fi
}

HOST_OS="$(uname -s)"

case "$PLATFORM" in
  linux)
    build_linux
    ;;
  windows)
    build_windows
    ;;
  macos)
    build_macos
    ;;
  android)
    build_android
    ;;
  ios)
    build_ios
    ;;
  web)
    build_web
    ;;
  all)
    echo "🚀 Building all available targets for host ($HOST_OS)..."
    build_web
    build_android
    if [ "$HOST_OS" = "Linux" ]; then
      build_linux
    elif [ "$HOST_OS" = "Darwin" ]; then
      build_macos
      build_ios
    else
      case "$HOST_OS" in
        MINGW*|MSYS*|CYGWIN*)
          build_windows
          ;;
        *)
          if [ "${OS:-}" = "Windows_NT" ]; then
            build_windows
          fi
          ;;
      esac
    fi
    ;;
esac

echo ""
echo "🎉 Build completed! Distributables located in:"
ls -la "$DIST_DIR" 2>/dev/null || true
