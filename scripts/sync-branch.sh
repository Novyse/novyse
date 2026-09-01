#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GLOBAL_DART="$ROOT_DIR/lib/core/config/global.dart"
IOS_XCCONFIG="$ROOT_DIR/ios/Flutter/AppEnvironment.xcconfig"
MACOS_XCCONFIG="$ROOT_DIR/macos/Runner/Configs/AppEnvironment.xcconfig"
IOS_ENTITLEMENTS="$ROOT_DIR/ios/Runner/Runner.entitlements"

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

case "$BRANCH" in
  "production")
    APP_NAME="Novyse"
    BUNDLE_ID="com.novyse"
    SCHEME="novyse"
    HOST_SUFFIX=""
    ;;
  "preview")
    APP_NAME="Novyse.preview"
    BUNDLE_ID="com.novyse.preview"
    SCHEME="novyse.preview"
    HOST_SUFFIX=".preview"
    ;;
  "development")
    APP_NAME="Novyse.dev"
    BUNDLE_ID="com.novyse.dev"
    SCHEME="novyse.dev"
    HOST_SUFFIX=".dev"
    ;;
  *)
    echo "❌ [SYNC-BRANCH ERROR] Unknown branch '$BRANCH'. Expected 'development', 'preview', or 'production'." >&2
    exit 1
    ;;
esac

# 1. Sync iOS & macOS AppEnvironment.xcconfig
cat << EOF > "$IOS_XCCONFIG"
// Generated automatically from lib/core/config/global.dart - DO NOT EDIT MANUALLY
APP_BRANCH = $BRANCH
APP_NAME = $APP_NAME
APP_BUNDLE_IDENTIFIER = $BUNDLE_ID
APP_SCHEME = $SCHEME
APP_HOST = app${HOST_SUFFIX}.novyse.com
EOF

cat << EOF > "$MACOS_XCCONFIG"
// Generated automatically from lib/core/config/global.dart - DO NOT EDIT MANUALLY
APP_BRANCH = $BRANCH
APP_NAME = $APP_NAME
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

# 3. Stage configuration files if modified
for f in "$IOS_XCCONFIG" "$MACOS_XCCONFIG" "$IOS_ENTITLEMENTS"; do
  rel_path="${f#$ROOT_DIR/}"
  if git diff --name-only "$f" 2>/dev/null | grep -q . || git status --porcelain "$f" 2>/dev/null | grep -q "^??"; then
    git add "$f"
    echo "🔄 [SYNC-BRANCH] Staged $rel_path"
  fi
done

echo "✅ [SYNC-BRANCH] Configured iOS/macOS environment: Branch=$BRANCH, BundleID=$BUNDLE_ID, Scheme=$SCHEME, Host=app${HOST_SUFFIX}.novyse.com"
