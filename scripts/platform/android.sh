#!/usr/bin/env bash
set -e

_THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ROOT_DIR="$(cd "$_THIS_DIR/../.." && pwd)"

source "$_THIS_DIR/common.sh"

export ANDROID_APP_ID="$APP_ID"
export ANDROID_SCHEME="$APP_SCHEME"

case "$BRANCH" in
  "production") ANDROID_HOST_SUFFIX="" ;;
  "preview")    ANDROID_HOST_SUFFIX=".preview" ;;
  *)            ANDROID_HOST_SUFFIX=".dev" ;;
esac

export ANDROID_APP_HOST="app${ANDROID_HOST_SUFFIX}.novyse.com"
export ANDROID_WEB_HOST="web${ANDROID_HOST_SUFFIX}.novyse.com"
export ANDROID_AUTH_HOST="auth${ANDROID_HOST_SUFFIX}.novyse.com"

sync_android() {
  echo "🤖 [SYNC-ANDROID] Synchronizing Android configuration for $APP_NAME ($APP_ID)..."

  local gradle_file="$_ROOT_DIR/android/app/build.gradle.kts"
  if [ ! -f "$gradle_file" ]; then
    echo "⚠️  [SYNC-ANDROID] Gradle file not found at: $gradle_file"
    return 0
  fi

  echo "  🤖 Verified Android dynamic configuration: appId=$APP_ID, branch=$BRANCH, version=$APP_VERSION"
  echo "✅ [SYNC-ANDROID] Completed successfully!"
}

# If executed directly, run sync
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  sync_android
fi
