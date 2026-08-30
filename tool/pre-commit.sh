#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🔍 [Pre-Commit] Running Flutter Analyze..."
flutter analyze

echo "🧪 [Pre-Commit] Running Flutter Tests..."
flutter test

echo "✅ [Pre-Commit] All checks and tests passed!"
