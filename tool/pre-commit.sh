#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🔄 [Pre-Commit] Syncing version..."
./scripts/sync-version.sh

echo "🔄 [Pre-Commit] Syncing branch & environment..."
./scripts/sync-branch.sh

# Stage any configuration files updated by the sync scripts
for f in pubspec.yaml ios/Flutter/AppEnvironment.xcconfig macos/Runner/Configs/AppEnvironment.xcconfig ios/Runner/Runner.entitlements; do
  if git diff --name-only | grep -q "^${f}$"; then
    git add "$f"
  fi
done

echo "🔍 [Pre-Commit] Running Flutter Analyze..."
flutter analyze

echo "🧪 [Pre-Commit] Running Flutter Tests..."
flutter test

echo "✅ [Pre-Commit] All checks and tests passed!"
