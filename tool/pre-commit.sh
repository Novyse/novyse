#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🔄 [Pre-Commit] Pulling latest changes..."
git fetch
git pull

echo "🔄 [Pre-Commit] Syncing version..."
./scripts/sync-version.sh

echo "🔄 [Pre-Commit] Syncing branch & environment..."
./scripts/sync-branch.sh

echo "🔍 [Pre-Commit] Running Flutter Analyze..."
flutter analyze

echo "🧪 [Pre-Commit] Running Flutter Tests..."
flutter test

echo "✅ [Pre-Commit] All checks and tests passed!"
