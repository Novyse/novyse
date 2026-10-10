#!/usr/bin/env bash
set -e

_THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ROOT_DIR="$(cd "$_THIS_DIR/../.." && pwd)"

source "$_THIS_DIR/common.sh"

export MACOS_CATEGORY="$(get_dart_field macOSCategory)"
[ -z "$MACOS_CATEGORY" ] && export MACOS_CATEGORY="public.app-category.social-networking"

export MACOS_BUNDLE_ID="$APP_ID"
export MACOS_ZIP_NAME="${APP_NAME}-${APP_VERSION}-macos.zip"
export MACOS_DMG_NAME="${APP_NAME}-${APP_VERSION}.dmg"

case "$BRANCH" in
  "production") MACOS_HOST_SUFFIX="" ;;
  "preview")    MACOS_HOST_SUFFIX=".preview" ;;
  *)            MACOS_HOST_SUFFIX=".dev" ;;
esac
export MACOS_APP_HOST="app${MACOS_HOST_SUFFIX}.novyse.com"

generate_macos_app_environment() {
  local target_file="$1"
  mkdir -p "$(dirname "$target_file")"
  cat << EOF > "$target_file"
// Generated automatically from lib/core/config/global.dart - DO NOT EDIT MANUALLY
APP_BRANCH = $BRANCH
APP_NAME = $APP_NAME
APP_DESCRIPTION = $APP_DESCRIPTION
APP_BUNDLE_IDENTIFIER = $APP_ID
APP_SCHEME = $APP_SCHEME
APP_HOST = $MACOS_APP_HOST
EOF
}

generate_macos_app_info() {
  local target_file="$1"
  mkdir -p "$(dirname "$target_file")"
  cat << EOF > "$target_file"
#include? "AppEnvironment.xcconfig"

// Application-level settings for the Runner target.
PRODUCT_NAME = \$(APP_NAME)

// The application's bundle identifier
PRODUCT_BUNDLE_IDENTIFIER = \$(APP_BUNDLE_IDENTIFIER)

// The copyright displayed in application information (Auto-updated year: $CURRENT_YEAR)
PRODUCT_COPYRIGHT = $COPYRIGHT
EOF
}

sync_macos() {
  echo "🍏 [SYNC-MACOS] Synchronizing macOS configurations for $APP_NAME ($APP_ID)..."

  local macos_env="$_ROOT_DIR/macos/Runner/Configs/AppEnvironment.xcconfig"
  local macos_appinfo="$_ROOT_DIR/macos/Runner/Configs/AppInfo.xcconfig"

  if [ -d "$(dirname "$macos_env")" ]; then
    generate_macos_app_environment "$macos_env"
    echo "  🍏 Updated macOS AppEnvironment ($macos_env)"
  fi

  if [ -d "$(dirname "$macos_appinfo")" ]; then
    generate_macos_app_info "$macos_appinfo"
    echo "  🍏 Updated macOS AppInfo ($macos_appinfo)"
  fi

  echo "✅ [SYNC-MACOS] Completed successfully!"
}

# If executed directly, run sync
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  sync_macos
fi
