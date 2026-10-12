#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

KEYS_JSON="$ROOT_DIR/desktop_updater.keys.json"
TARGET_DART="$ROOT_DIR/lib/core/updater/updater_keys.dart"

if [ ! -f "$KEYS_JSON" ]; then
  echo "⚠️  [SYNC-UPDATE-KEYS WARNING] Keys file not found at: $KEYS_JSON (skipping)"
  exit 0
fi

KEY_ENTRIES=$(sed -n '/"publicKeys"[[:space:]]*:[[:space:]]*{/,/}/p' "$KEYS_JSON" | \
  grep -E '"[^"]+"[[:space:]]*:[[:space:]]*"[^"]+"' | \
  sed -E "s/^[[:space:]]*\"([^\"]+)\"[[:space:]]*:[[:space:]]*\"([^\"]+)\".*/  '\1':\n      '\2',/")

TMP_FILE="$(mktemp)"

cat << EOF > "$TMP_FILE"
library;

import '../config/global.dart' as config;

/// Public Ed25519 keys trusted for production desktop update metadata.
///
/// Automatically synchronized from desktop_updater.keys.json via
/// \`scripts/sync-update-keys.sh\`.
EOF

if [ -n "$KEY_ENTRIES" ]; then
  cat << EOF >> "$TMP_FILE"
const trustedReleasePublicKeys = <String, String>{
$KEY_ENTRIES
};
EOF
else
  cat << EOF >> "$TMP_FILE"
const trustedReleasePublicKeys = <String, String>{};
EOF
fi

cat << EOF >> "$TMP_FILE"

/// Stable production feed URL (GitHub Release asset, single channel).
///
/// Pulls default feed URL from [config.desktopUpdaterArchiveUrl] in global.dart.
final Uri productionAppArchiveUrl = Uri.parse(
  config.desktopUpdaterArchiveUrl,
);
EOF

mkdir -p "$(dirname "$TARGET_DART")"

if [ -f "$TARGET_DART" ] && cmp -s "$TMP_FILE" "$TARGET_DART"; then
  rm -f "$TMP_FILE"
  echo "✅ [SYNC-UPDATE-KEYS] updater_keys.dart is already up to date"
else
  mv "$TMP_FILE" "$TARGET_DART"
  echo "🔄 [SYNC-UPDATE-KEYS] Updated lib/core/updater/updater_keys.dart from desktop_updater.keys.json"
fi
