#!/usr/bin/env bash

_THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ROOT_DIR="$(cd "$_THIS_DIR/../.." && pwd)"
_GLOBAL_DART="$_ROOT_DIR/lib/core/config/global.dart"

if [ ! -f "$_GLOBAL_DART" ]; then
  echo "❌ [COMMON ERROR] Configuration file not found: $_GLOBAL_DART" >&2
  exit 1
fi

_GLOBAL_CONTENT=$(tr '\r\n' '  ' < "$_GLOBAL_DART")

# Portable in-place sed
sed_inplace() {
  if [ "$(uname -s)" = "Darwin" ]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# 1. Extract active deployment branch
BRANCH=$(sed -n "s/.*const[[:space:]]\{1,\}String[[:space:]]\{1,\}branch[[:space:]]*=[[:space:]]*['\"]\([^'\"]\{1,\}\)['\"].*/\1/p" "$_GLOBAL_DART" | head -n 1)
[ -z "$BRANCH" ] && BRANCH="development"

# 2. Pure Bash resolver for constants in global.dart
get_dart_field() {
  local var="$1"
  local target_branch="${2:-$BRANCH}"
  local val=""

  # Check branch-conditional ternary expression
  case "$target_branch" in
    "production")
      val=$(echo "$_GLOBAL_CONTENT" | sed -n "s/.*const[[:space:]]\{1,\}String[[:space:]]\{1,\}$var[[:space:]]*=[[:space:]]*branch[[:space:]]*==[[:space:]]*['\"]production['\"][[:space:]]*?[[:space:]]*['\"]\([^'\"]\{1,\}\)['\"].*/\1/p")
      ;;
    "preview")
      val=$(echo "$_GLOBAL_CONTENT" | sed -n "s/.*const[[:space:]]\{1,\}String[[:space:]]\{1,\}$var[[:space:]]*=[^;]*branch[[:space:]]*==[[:space:]]*['\"]preview['\"][[:space:]]*?[[:space:]]*['\"]\([^'\"]\{1,\}\)['\"].*/\1/p")
      ;;
    *)
      val=$(echo "$_GLOBAL_CONTENT" | sed -n "s/.*const[[:space:]]\{1,\}String[[:space:]]\{1,\}$var[[:space:]]*=[^;]*:[[:space:]]*['\"]\([^'\"]\{1,\}\)['\"][[:space:]]*)[[:space:]]*;.*/\1/p")
      ;;
  esac

  if [ -n "$val" ]; then
    echo "$val"
    return 0
  fi

  # Check simple constant: const String var = 'val';
  val=$(echo "$_GLOBAL_CONTENT" | sed -n "s/.*const[[:space:]]\{1,\}String[[:space:]]\{1,\}$var[[:space:]]*=[[:space:]]*['\"]\([^'\"]\{1,\}\)['\"][[:space:]]*;.*/\1/p")
  if [ -n "$val" ]; then
    echo "$val"
    return 0
  fi

  # Check concatenated string literal: const String var = 'p1' 'p2';
  val=$(echo "$_GLOBAL_CONTENT" | sed -n "s/.*const[[:space:]]\{1,\}String[[:space:]]\{1,\}$var[[:space:]]*=[[:space:]]*\(['\"][^;]*\);.*/\1/p")
  if [ -n "$val" ]; then
    echo "$val" | sed "s/['\"]//g" | sed "s/[[:space:]]\{1,\}/ /g" | sed "s/^ //;s/ $//"
    return 0
  fi

  # Check reference to another variable: const String var = otherVar;
  local ref
  ref=$(echo "$_GLOBAL_CONTENT" | sed -n "s/.*const[[:space:]]\{1,\}String[[:space:]]\{1,\}$var[[:space:]]*=[[:space:]]*\([a-zA-Z0-9_]\{1,\}\)[[:space:]]*;.*/\1/p")
  if [ -n "$ref" ] && [ "$ref" != "$var" ]; then
    get_dart_field "$ref" "$target_branch"
    return 0
  fi
}

# Export common metadata
export BRANCH="$BRANCH"
export APP_ID="$(get_dart_field appId)"
export APP_NAME="$(get_dart_field appName)"
export APP_VERSION="$(get_dart_field appVersion)"
export APP_DESCRIPTION="$(get_dart_field appDescription)"
export AUTHOR_NAME="$(get_dart_field authorName)"
export AUTHOR_EMAIL="$(get_dart_field authorEmail)"
export AUTHOR_URL="$(get_dart_field authorUrl)"
export PROJECT_LICENSE="$(get_dart_field projectLicense)"
export METADATA_LICENSE="$(get_dart_field metadataLicense)"
export APP_SCHEME="$(get_dart_field appScheme)"
export INSTALLER_NAME="$(get_dart_field installerName)"
export PKG_NAME="$(get_dart_field packageName)"
export RELEASES_URL="$(get_dart_field releasesUrl)"
export APP_STORE_URL="$(get_dart_field appStoreUrl)"
export ISSUES_URL="$(get_dart_field issuesUrl)"

export CURRENT_YEAR=$(date +%Y)
export CURRENT_DATE=$(date +%Y-%m-%d)
export COPYRIGHT="Copyright © ${CURRENT_YEAR} ${AUTHOR_NAME:-Novyse}. All rights reserved."
