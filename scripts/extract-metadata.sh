#!/usr/bin/env bash

_THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_PLATFORM_DIR="$_THIS_DIR/platform"

# 1. Source common metadata
source "$_PLATFORM_DIR/common.sh"

# 2. Source platform-specific metadata and generators
source "$_PLATFORM_DIR/linux.sh"
source "$_PLATFORM_DIR/windows.sh"
source "$_PLATFORM_DIR/macos.sh"
source "$_PLATFORM_DIR/ios.sh"
source "$_PLATFORM_DIR/android.sh"
source "$_PLATFORM_DIR/web.sh"

if [ "${BASH_SOURCE[0]}" = "${0}" ] && [ -n "$1" ]; then
  case "$1" in
    branch) echo "$BRANCH" ;;
    appId) echo "$APP_ID" ;;
    appName) echo "$APP_NAME" ;;
    appVersion) echo "$APP_VERSION" ;;
    appDescription) echo "$APP_DESCRIPTION" ;;
    authorName) echo "$AUTHOR_NAME" ;;
    authorEmail) echo "$AUTHOR_EMAIL" ;;
    authorUrl) echo "$AUTHOR_URL" ;;
    projectLicense) echo "$PROJECT_LICENSE" ;;
    metadataLicense) echo "$METADATA_LICENSE" ;;
    appScheme) echo "$APP_SCHEME" ;;
    installerName) echo "$INSTALLER_NAME" ;;
    packageName) echo "$PKG_NAME" ;;
    releasesUrl) echo "$RELEASES_URL" ;;
    appStoreUrl) echo "$APP_STORE_URL" ;;
    copyright) echo "$COPYRIGHT" ;;
    *) get_dart_field "$1" ;;
  esac
  exit 0
fi
