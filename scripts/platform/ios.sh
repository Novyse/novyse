#!/usr/bin/env bash
set -e

_THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ROOT_DIR="$(cd "$_THIS_DIR/../.." && pwd)"

source "$_THIS_DIR/common.sh"

export IOS_BUNDLE_ID="$APP_ID"
export IOS_SCHEME="$APP_SCHEME"

case "$BRANCH" in
  "production") IOS_HOST_SUFFIX="" ;;
  "preview")    IOS_HOST_SUFFIX=".preview" ;;
  *)            IOS_HOST_SUFFIX=".dev" ;;
esac
export IOS_APP_HOST="app${IOS_HOST_SUFFIX}.novyse.com"

generate_ios_app_environment() {
  local target_file="$1"
  mkdir -p "$(dirname "$target_file")"
  cat << EOF > "$target_file"
// Generated automatically from lib/core/config/global.dart - DO NOT EDIT MANUALLY
APP_BRANCH = $BRANCH
APP_NAME = $APP_NAME
APP_DESCRIPTION = $APP_DESCRIPTION
APP_BUNDLE_IDENTIFIER = $APP_ID
APP_SCHEME = $APP_SCHEME
APP_HOST = $IOS_APP_HOST
EOF
}

generate_ios_entitlements() {
  local target_file="$1"
  mkdir -p "$(dirname "$target_file")"
  if [ "$BRANCH" = "production" ]; then
    cat << EOF > "$target_file"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.associated-domains</key>
	<array>
		<string>applinks:app.novyse.com</string>
		<string>applinks:web.novyse.com</string>
		<string>applinks:auth.novyse.com</string>
		<string>applinks:vyse.me</string>
		<string>applinks:novyse.com</string>
		<string>webcredentials:auth.novyse.com</string>
	</array>
</dict>
</plist>
EOF
  else
    cat << EOF > "$target_file"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.associated-domains</key>
	<array>
		<string>applinks:app${IOS_HOST_SUFFIX}.novyse.com</string>
		<string>applinks:web${IOS_HOST_SUFFIX}.novyse.com</string>
		<string>applinks:auth${IOS_HOST_SUFFIX}.novyse.com</string>
		<string>webcredentials:app${IOS_HOST_SUFFIX}.novyse.com</string>
		<string>webcredentials:auth${IOS_HOST_SUFFIX}.novyse.com</string>
	</array>
</dict>
</plist>
EOF
  fi
}

sync_ios() {
  echo "📱 [SYNC-IOS] Synchronizing iOS configurations for $APP_NAME ($APP_ID)..."

  local ios_xcconfig="$_ROOT_DIR/ios/Flutter/AppEnvironment.xcconfig"
  local ios_entitlements="$_ROOT_DIR/ios/Runner/Runner.entitlements"

  if [ -d "$(dirname "$ios_xcconfig")" ]; then
    generate_ios_app_environment "$ios_xcconfig"
    echo "  📱 Updated iOS AppEnvironment ($ios_xcconfig)"
  fi

  if [ -d "$(dirname "$ios_entitlements")" ]; then
    generate_ios_entitlements "$ios_entitlements"
    echo "  📱 Updated iOS Runner Entitlements ($ios_entitlements)"
  fi

  echo "✅ [SYNC-IOS] Completed successfully!"
}

# If executed directly, run sync
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  sync_ios
fi
