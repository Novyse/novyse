#!/usr/bin/env bash
set -e

TARGET_PLATFORM="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
HOST_OS="$(uname -s)"

if [ -z "$TARGET_PLATFORM" ]; then
  echo "❌ Error: No platform specified for platform check."
  echo "Usage: $0 <web|linux|windows|macos>"
  exit 1
fi

case "$TARGET_PLATFORM" in
  web)
    chrome_found=0
    if [ -n "$CHROME_EXECUTABLE" ] && [ -x "$CHROME_EXECUTABLE" ]; then
      chrome_found=1
    elif command -v google-chrome >/dev/null 2>&1 || \
         command -v google-chrome-stable >/dev/null 2>&1 || \
         command -v chromium >/dev/null 2>&1 || \
         command -v chromium-browser >/dev/null 2>&1 || \
         command -v chrome >/dev/null 2>&1; then
      chrome_found=1
    elif [ "$HOST_OS" = "Darwin" ] && [ -d "/Applications/Google Chrome.app" ]; then
      chrome_found=1
    fi

    if [ "$chrome_found" -eq 0 ]; then
      echo "⚠️  Warning: Google Chrome / Chromium executable not found in PATH."
      echo "   If launching fails, install Chrome or set the CHROME_EXECUTABLE environment variable."
    fi
    ;;
  linux)
    if [ "$HOST_OS" != "Linux" ]; then
      echo "❌ Error: Cannot run Linux desktop on '$HOST_OS'. A Linux host machine is required."
      exit 1
    fi

    missing_tools=()
    if ! command -v cmake >/dev/null 2>&1; then missing_tools+=("cmake"); fi
    if ! command -v ninja >/dev/null 2>&1 && ! command -v ninja-build >/dev/null 2>&1; then missing_tools+=("ninja"); fi
    if ! command -v pkg-config >/dev/null 2>&1; then missing_tools+=("pkg-config"); fi
    if ! command -v clang >/dev/null 2>&1 && ! command -v gcc >/dev/null 2>&1; then missing_tools+=("clang/gcc"); fi

    if [ ${#missing_tools[@]} -gt 0 ]; then
      echo "❌ Error: Missing required build tool(s) for Linux desktop: ${missing_tools[*]}"
      echo "   Install them with your package manager (e.g. 'sudo dnf install ${missing_tools[*]}' or 'sudo apt install ${missing_tools[*]}')."
      exit 1
    fi

    if command -v pkg-config >/dev/null 2>&1 && ! pkg-config --exists gtk+-3.0 2>/dev/null; then
      echo "⚠️  Warning: GTK 3 development headers ('gtk+-3.0') were not detected by pkg-config."
      echo "   You may need to install 'libgtk-3-dev' (Ubuntu/Debian) or 'gtk3-devel' (Fedora)."
    fi

    if command -v pkg-config >/dev/null 2>&1; then
      if ! pkg-config --exists gstreamer-1.0 2>/dev/null; then
        echo "⚠️  Warning: GStreamer development headers ('gstreamer-1.0') were not detected by pkg-config."
        echo "   Required by audioplayers_linux. Install 'libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev' (Ubuntu/Debian)."
      fi
      if ! pkg-config --exists libsecret-1 2>/dev/null; then
        echo "⚠️  Warning: libsecret headers ('libsecret-1') were not detected by pkg-config."
        echo "   Required by flutter_secure_storage. Install 'libsecret-1-dev libjson-glib-dev' (Ubuntu/Debian)."
      fi
    fi
    ;;
  windows)
    case "$HOST_OS" in
      MINGW*|MSYS*|CYGWIN*)
        ;;
      *)
        if [ "${OS:-}" != "Windows_NT" ]; then
          echo "❌ Error: Cannot run Windows desktop on '$HOST_OS'. A Windows host machine is required."
          exit 1
        fi
        ;;
    esac
    ;;
  macos|mac)
    if [ "$HOST_OS" != "Darwin" ]; then
      echo "❌ Error: Cannot run macOS desktop on '$HOST_OS'. A macOS (Darwin) host machine is required."
      exit 1
    fi

    if ! xcode-select -p >/dev/null 2>&1; then
      echo "❌ Error: Xcode Command Line Tools are missing."
      echo "   Please install them by running: xcode-select --install"
      exit 1
    fi

    if ! command -v pod >/dev/null 2>&1; then
      echo "⚠️  Warning: 'pod' (CocoaPods) was not found in PATH."
      echo "   macOS builds may fail if native pods are required. Install with 'brew install cocoapods' or 'sudo gem install cocoapods'."
    fi
    ;;
  android)
    if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
      if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
      elif [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
      fi
    fi
    ;;
  ios)
    if [ "$HOST_OS" != "Darwin" ]; then
      echo "❌ Error: Cannot build/run iOS on '$HOST_OS'. A macOS (Darwin) host machine is required."
      exit 1
    fi
    if ! xcode-select -p >/dev/null 2>&1; then
      echo "❌ Error: Xcode Command Line Tools are missing."
      exit 1
    fi
    ;;
  *)
    echo "❌ Error: Unknown platform '$TARGET_PLATFORM' for platform check."
    exit 1
    ;;
esac
