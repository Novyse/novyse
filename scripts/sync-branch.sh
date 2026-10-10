#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

PUBSPEC="$ROOT_DIR/pubspec.yaml"

echo "🌿 [SYNC-BRANCH] Synchronizing pubspec.yaml for branch '$BRANCH'..."

if [ -f "$PUBSPEC" ]; then
  CURRENT_NAME=$(grep "^name:" "$PUBSPEC" | head -n 1)
  TARGET_NAME="name: novyse"
  if [ "$CURRENT_NAME" != "$TARGET_NAME" ]; then
    sed_inplace "s/^name:.*/${TARGET_NAME}/" "$PUBSPEC"
    echo "  📦 Updated pubspec.yaml name to: ${TARGET_NAME}"
  fi

  CURRENT_DESC=$(grep "^description:" "$PUBSPEC" | head -n 1)
  TARGET_DESC="description: \"$APP_DESCRIPTION\""
  if [ "$CURRENT_DESC" != "$TARGET_DESC" ]; then
    sed_inplace "s/^description:.*/${TARGET_DESC}/" "$PUBSPEC"
    echo "  📦 Updated pubspec.yaml description to: ${TARGET_DESC}"
  fi
else
  echo "❌ [SYNC-BRANCH ERROR] pubspec.yaml not found at: $PUBSPEC" >&2
  exit 1
fi

echo "✅ [SYNC-BRANCH] Completed successfully! (name: novyse, description: \"$APP_DESCRIPTION\")"
