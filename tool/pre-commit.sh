#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🔄 [Pre-Commit] Syncing version from config/global.dart..."
./scripts/sync-version.sh

# If pubspec.yaml was modified by sync, stage it automatically
if git diff --name-only | grep -q "^pubspec.yaml$"; then
  git add pubspec.yaml
fi

echo "🔍 [Pre-Commit] Running Flutter Analyze..."
flutter analyze

echo "🧪 [Pre-Commit] Running Flutter Tests..."
flutter test

echo "✅ [Pre-Commit] All checks and tests passed!"
