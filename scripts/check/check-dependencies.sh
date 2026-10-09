#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Verify flutter is available
bash "$SCRIPT_DIR/check-flutter.sh"

needs_pub_get=0
if [ ! -f "$ROOT_DIR/.dart_tool/package_config.json" ]; then
  needs_pub_get=1
elif [ "$ROOT_DIR/pubspec.yaml" -nt "$ROOT_DIR/.dart_tool/package_config.json" ] || \
     [ "$ROOT_DIR/pubspec.lock" -nt "$ROOT_DIR/.dart_tool/package_config.json" ]; then
  needs_pub_get=1
fi

if [ "$needs_pub_get" -eq 1 ]; then
  echo "📦 Dependencies are missing or outdated. Running 'flutter pub get'..."
  (cd "$ROOT_DIR" && flutter pub get) || {
    echo "❌ Error: 'flutter pub get' failed to resolve dependencies."
    exit 1
  }
  touch "$ROOT_DIR/.dart_tool/package_config.json"
fi

if [ ! -f "$ROOT_DIR/lib/core/settings/oss_licenses.dart" ]; then
  echo "🔄 [run.sh] OSS licenses file missing, generating..."
  bash "$ROOT_DIR/scripts/sync-licenses.sh" || {
    echo "❌ Error: Failed to generate OSS licenses."
    exit 1
  }
fi
