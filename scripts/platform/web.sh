#!/usr/bin/env bash
set -e

_THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ROOT_DIR="$(cd "$_THIS_DIR/../.." && pwd)"

source "$_THIS_DIR/common.sh"

case "$BRANCH" in
  "production") WEB_HOST_SUFFIX="" ;;
  "preview")    WEB_HOST_SUFFIX=".preview" ;;
  *)            WEB_HOST_SUFFIX=".dev" ;;
esac

export WEB_APP_HOST="app${WEB_HOST_SUFFIX}.novyse.com"

# Updates web/manifest.json using jq or sed
update_web_manifest() {
  local manifest_file="$1"
  [ ! -f "$manifest_file" ] && return 0

  if command -v jq >/dev/null 2>&1; then
    local tmp_file
    tmp_file=$(mktemp)
    jq --arg name "$APP_NAME" \
       --arg desc "$APP_DESCRIPTION" \
       '.name = $name | .short_name = $name | .description = $desc' \
       "$manifest_file" > "$tmp_file" && mv "$tmp_file" "$manifest_file"
  else
    sed -i "s/\"name\": \"[^\"]*\"/\"name\": \"$APP_NAME\"/" "$manifest_file"
    sed -i "s/\"short_name\": \"[^\"]*\"/\"short_name\": \"$APP_NAME\"/" "$manifest_file"
    sed -i "s/\"description\": \"[^\"]*\"/\"description\": \"$APP_DESCRIPTION\"/" "$manifest_file"
  fi
}

# Updates web/index.html using sed
update_web_index() {
  local index_file="$1"
  [ ! -f "$index_file" ] && return 0

  sed -i "s/<title>[^<]*<\/title>/<title>$APP_NAME<\/title>/" "$index_file"
  sed -i "s/<meta name=\"description\" content=\"[^\"]*\"/<meta name=\"description\" content=\"$APP_DESCRIPTION\"/" "$index_file"
  sed -i "s/<meta name=\"apple-mobile-web-app-title\" content=\"[^\"]*\"/<meta name=\"apple-mobile-web-app-title\" content=\"$APP_NAME\"/" "$index_file"
}

sync_web() {
  echo "🌐 [SYNC-WEB] Synchronizing Web configuration for $APP_NAME ($APP_ID)..."

  local web_manifest="$_ROOT_DIR/web/manifest.json"
  local web_index="$_ROOT_DIR/web/index.html"

  if [ -f "$web_manifest" ]; then
    update_web_manifest "$web_manifest"
    echo "  🌐 Updated Web manifest ($web_manifest)"
  fi

  if [ -f "$web_index" ]; then
    update_web_index "$web_index"
    echo "  🌐 Updated Web HTML metadata ($web_index)"
  fi

  echo "✅ [SYNC-WEB] Completed successfully!"
}

# If executed directly, run sync
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  sync_web
fi
