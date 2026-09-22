#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GLOBAL_DART="$ROOT_DIR/lib/core/config/global.dart"
IOS_XCCONFIG="$ROOT_DIR/ios/Flutter/AppEnvironment.xcconfig"
MACOS_XCCONFIG="$ROOT_DIR/macos/Runner/Configs/AppEnvironment.xcconfig"
IOS_ENTITLEMENTS="$ROOT_DIR/ios/Runner/Runner.entitlements"
PUBSPEC="$ROOT_DIR/pubspec.yaml"
WEB_INDEX="$ROOT_DIR/web/index.html"
WEB_MANIFEST="$ROOT_DIR/web/manifest.json"

if [ ! -f "$GLOBAL_DART" ]; then
  echo "❌ [SYNC-BRANCH ERROR] Configuration file not found: $GLOBAL_DART" >&2
  exit 1
fi

# Extract branch directly from global.dart (strict, no fallback)
BRANCH=$(sed -n "s/.*const[[:space:]]\+String[[:space:]]\+branch[[:space:]]*=[[:space:]]*['\"]\([^'\"]\+\)['\"].*/\1/p" "$GLOBAL_DART" | head -n 1)

if [ -z "$BRANCH" ]; then
  echo "❌ [SYNC-BRANCH ERROR] 'const String branch' must be defined in $GLOBAL_DART" >&2
  exit 1
fi

get_dart_meta() {
  local var="$1"
  local branch="$2"
  local content
  content=$(tr '\r\n' '  ' < "$GLOBAL_DART")
  case "$branch" in
    "production")
      echo "$content" | sed -n "s/.*const[[:space:]]\+String[[:space:]]\+$var[[:space:]]*=[[:space:]]*branch[[:space:]]*==[[:space:]]*['\"]production['\"][[:space:]]*?[[:space:]]*['\"]\([^'\"]\+\)['\"].*/\1/p"
      ;;
    "preview")
      echo "$content" | sed -n "s/.*const[[:space:]]\+String[[:space:]]\+$var[[:space:]]*=[^;]*branch[[:space:]]*==[[:space:]]*['\"]preview['\"][[:space:]]*?[[:space:]]*['\"]\([^'\"]\+\)['\"].*/\1/p"
      ;;
    *)
      echo "$content" | sed -n "s/.*const[[:space:]]\+String[[:space:]]\+$var[[:space:]]*=[^;]*:[[:space:]]*['\"]\([^'\"]\+\)['\"][[:space:]]*)[[:space:]]*;.*/\1/p"
      ;;
  esac
}

APP_NAME=$(get_dart_meta "appName" "$BRANCH")
DESKTOP_DESCRIPTION=$(get_dart_meta "desktopDescription" "$BRANCH")
MOBILE_DESCRIPTION=$(get_dart_meta "mobileDescription" "$BRANCH")
WEB_DESCRIPTION=$(get_dart_meta "webDescription" "$BRANCH")

if [ -z "$APP_NAME" ]; then
  APP_NAME=$(sed -n "s/.*const[[:space:]]\+String[[:space:]]\+appName[[:space:]]*=[[:space:]]*['\"]\([^'\"]\+\)['\"].*/\1/p" "$GLOBAL_DART" | head -n 1)
fi
if [ -z "$DESKTOP_DESCRIPTION" ]; then
  DESKTOP_DESCRIPTION="A desktop client for Novyse"
fi
if [ -z "$MOBILE_DESCRIPTION" ]; then
  MOBILE_DESCRIPTION="A mobile client for Novyse"
fi
if [ -z "$WEB_DESCRIPTION" ]; then
  WEB_DESCRIPTION="A web client for Novyse"
fi

BUNDLE_ID="com.${APP_NAME,,}"
SCHEME="${APP_NAME,,}"
case "$BRANCH" in
  "production") HOST_SUFFIX="" ;;
  "preview")    HOST_SUFFIX=".preview" ;;
  *)            HOST_SUFFIX=".dev" ;;
esac

# 1. Sync iOS & macOS AppEnvironment.xcconfig
cat << EOF > "$IOS_XCCONFIG"
// Generated automatically from lib/core/config/global.dart - DO NOT EDIT MANUALLY
APP_BRANCH = $BRANCH
APP_NAME = $APP_NAME
APP_DESCRIPTION = $MOBILE_DESCRIPTION
APP_BUNDLE_IDENTIFIER = $BUNDLE_ID
APP_SCHEME = $SCHEME
APP_HOST = app${HOST_SUFFIX}.novyse.com
EOF

cat << EOF > "$MACOS_XCCONFIG"
// Generated automatically from lib/core/config/global.dart - DO NOT EDIT MANUALLY
APP_BRANCH = $BRANCH
APP_NAME = $APP_NAME
APP_DESCRIPTION = $DESKTOP_DESCRIPTION
APP_BUNDLE_IDENTIFIER = $BUNDLE_ID
APP_SCHEME = $SCHEME
APP_HOST = app${HOST_SUFFIX}.novyse.com
EOF

# 2. Sync iOS Runner.entitlements (Isolated per branch)
if [ "$BRANCH" = "production" ]; then
  cat << EOF > "$IOS_ENTITLEMENTS"
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
  cat << EOF > "$IOS_ENTITLEMENTS"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.associated-domains</key>
	<array>
		<string>applinks:app${HOST_SUFFIX}.novyse.com</string>
		<string>applinks:web${HOST_SUFFIX}.novyse.com</string>
		<string>applinks:auth${HOST_SUFFIX}.novyse.com</string>
		<string>webcredentials:app${HOST_SUFFIX}.novyse.com</string>
		<string>webcredentials:auth${HOST_SUFFIX}.novyse.com</string>
	</array>
</dict>
</plist>
EOF
fi

# 3. Sync pubspec.yaml description
if [ -f "$PUBSPEC" ]; then
  sed -i "s/^description:.*/description: \"$APP_DESCRIPTION\"/" "$PUBSPEC"
fi

# 4. Sync Web assets
if [ -f "$WEB_INDEX" ]; then
  sed -i "s/<meta name=\"description\" content=\"[^\"]*\"/<meta name=\"description\" content=\"$WEB_DESCRIPTION\"/" "$WEB_INDEX"
  sed -i "s/<meta name=\"apple-mobile-web-app-title\" content=\"[^\"]*\"/<meta name=\"apple-mobile-web-app-title\" content=\"$APP_NAME\"/" "$WEB_INDEX"
  sed -i "s/<title>[^<]*<\/title>/<title>$APP_NAME<\/title>/" "$WEB_INDEX"
fi

if [ -f "$WEB_MANIFEST" ]; then
  sed -i "s/\"name\": \"[^\"]*\"/\"name\": \"$APP_NAME\"/" "$WEB_MANIFEST"
  sed -i "s/\"short_name\": \"[^\"]*\"/\"short_name\": \"$APP_NAME\"/" "$WEB_MANIFEST"
  sed -i "s/\"description\": \"[^\"]*\"/\"description\": \"$WEB_DESCRIPTION\"/" "$WEB_MANIFEST"
fi

# 5. Stage configuration files if modified
for f in "$IOS_XCCONFIG" "$MACOS_XCCONFIG" "$IOS_ENTITLEMENTS" "$PUBSPEC" "$WEB_INDEX" "$WEB_MANIFEST"; do
  rel_path="${f#$ROOT_DIR/}"
  if git diff --name-only "$f" 2>/dev/null | grep -q . || git status --porcelain "$f" 2>/dev/null | grep -q "^??"; then
    git add "$f"
    echo "🔄 [SYNC-BRANCH] Staged $rel_path"
  fi
done

echo "✅ [SYNC-BRANCH] Configured environment: Branch=$BRANCH, AppName=$APP_NAME, DesktopDesc=\"$DESKTOP_DESCRIPTION\", MobileDesc=\"$MOBILE_DESCRIPTION\", WebDesc=\"$WEB_DESCRIPTION\""
