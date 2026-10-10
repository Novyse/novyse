#!/usr/bin/env bash
set -e

if ! command -v flutter >/dev/null 2>&1; then
  echo "❌ Error: 'flutter' command not found."
  echo "   Please install the Flutter SDK (https://docs.flutter.dev/get-started/install) and ensure it is in your PATH."
  exit 1
fi
