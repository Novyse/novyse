#!/usr/bin/env bash
set -e

_THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ROOT_DIR="$(cd "$_THIS_DIR/../.." && pwd)"

source "$_THIS_DIR/common.sh"

export LINUX_CATEGORIES="$(get_dart_field linuxCategories)"
[ -z "$LINUX_CATEGORIES" ] && export LINUX_CATEGORIES="Network;InstantMessaging;Chat;"
export LINUX_KEYWORDS="$(get_dart_field linuxKeywords)"
[ -z "$LINUX_KEYWORDS" ] && export LINUX_KEYWORDS="chat;messaging;voip;call;communication;novyse;"

# Generate desktop entry on-demand
generate_desktop_entry() {
  local target_file="$1"
  local APP_ID="${2:-$APP_ID}"
  mkdir -p "$(dirname "$target_file")"
  cat << EOF > "$target_file"
[Desktop Entry]
Name=${APP_NAME}
GenericName=Chat & VoIP Client
Comment=${APP_DESCRIPTION}
Exec=novyse %U
Icon=${APP_ID}
Terminal=false
Type=Application
Categories=${LINUX_CATEGORIES}
Keywords=${LINUX_KEYWORDS}
MimeType=x-scheme-handler/${APP_SCHEME};
StartupWMClass=${APP_ID}
SingleMainWindow=true
EOF
}

# Generate AppStream metadata on-demand
generate_appstream_metainfo() {
  local target_file="$1"
  local APP_ID="${2:-$APP_ID}"
  mkdir -p "$(dirname "$target_file")"
  local categories_xml=""
  IFS=';' read -ra _cats <<< "${LINUX_CATEGORIES}"
  for _cat in "${_cats[@]}"; do
    [ -n "$_cat" ] && categories_xml="${categories_xml}    <category>${_cat}</category>
"
  done

  cat << EOF > "$target_file"
<?xml version="1.0" encoding="utf-8"?>
<component type="desktop-application">
  <id>${APP_ID}</id>
  <metadata_license>${METADATA_LICENSE:-CC0-1.0}</metadata_license>
  <project_license>${PROJECT_LICENSE:-GPL-3.0-or-later}</project_license>
  <name>${APP_NAME}</name>
  <summary>${APP_DESCRIPTION%.}</summary>
  <description>
    <p>
      Own the Infrastructure. Rule the Conversation. Your communication, your rules.
      Novyse brings rich messaging, crystal-clear VoIP, self-hostable infrastructure,
      and full customization—all under your control. Made in Italy and fully GDPR compliant.
    </p>
    <p>Key features of the Novyse experience:</p>
    <ul>
      <li>Rich Messages: Text, images, videos, audio, voice notes.</li>
      <li>HQ Voice &amp; Video: Opus-encoded audio with real-time waveform visualization.</li>
      <li>Live ON AIR: Ultra low-latency voice communications and up to 4K screen sharing.</li>
      <li>Full Offline Mode: Access all messages and chat history offline with automatic synchronization.</li>
    </ul>
  </description>
  <launchable type="desktop-id">${APP_ID}.desktop</launchable>
  <url type="homepage">${AUTHOR_URL}</url>
  <url type="bugtracker">${ISSUES_URL:-https://github.com/Novyse/novyse/issues}</url>
  <url type="vcs-browser">https://github.com/Novyse/novyse</url>
  <developer id="${APP_ID}">
    <name>${AUTHOR_NAME}</name>
  </developer>
  <categories>
${categories_xml}  </categories>
  <screenshots>
    <screenshot type="default">
      <caption>The main interface of Novyse client</caption>
      <image>https://raw.githubusercontent.com/Novyse/novyse/production/assets/images/screenshot.png</image>
    </screenshot>
  </screenshots>
  <content_rating type="oars-1.1" />
  <releases>
    <release version="${APP_VERSION}" date="${CURRENT_DATE}" />
  </releases>
  <provides>
    <mediatype>x-scheme-handler/${APP_SCHEME}</mediatype>
  </provides>
  <supports>
    <control>pointing</control>
    <control>keyboard</control>
    <control>touch</control>
  </supports>
</component>
EOF
}

# Generate Snapcraft configuration on-demand
generate_snapcraft_yaml() {
  local target_file="$1"
  local source_path="${2:-bundle}"
  mkdir -p "$(dirname "$target_file")"
  cat << EOF > "$target_file"
name: ${PKG_NAME}
base: core26
version: '${APP_VERSION}'
summary: ${APP_DESCRIPTION}
description: |
  Own the Infrastructure. Rule the Conversation. Your communication, your rules.
  Novyse brings rich messaging, crystal-clear VoIP, self-hostable infrastructure,
  and full customization—all under your control. Made in Italy and GDPR compliant.

grade: stable
confinement: strict

apps:
  novyse:
    command: novyse
    extensions: [gnome]
    plugs:
      - network
      - network-bind
      - audio-playback
      - audio-record
      - camera
      - home
      - desktop
      - desktop-legacy
      - gsettings
      - wayland
      - x11
      - opengl

parts:
  novyse:
    plugin: dump
    source: ${source_path}
    stage-packages:
      - libsecret-1-0
EOF
}

# Install the pre-rendered hicolor icon set committed under linux/packaging/icons.
# The canonical files are named novyse.*; they are renamed to the active APP_ID.
generate_linux_icons() {
  local target_root="${1:-$_ROOT_DIR/linux/packaging/icons}"
  local APP_ID="${2:-$APP_ID}"
  local source_root="$_ROOT_DIR/linux/packaging/icons"

  for s in 16 24 32 48 64 128 256 512; do
    local src="${source_root}/hicolor/${s}x${s}/apps/novyse.png"
    local dest_dir="${target_root}/hicolor/${s}x${s}/apps"
    if [ ! -f "$src" ]; then
      echo "❌ [ICONS] Missing pre-rendered icon: $src" >&2
      return 1
    fi
    mkdir -p "$dest_dir"
    cp "$src" "$dest_dir/${APP_ID}.png"
  done

  local svg_src="${source_root}/hicolor/scalable/apps/novyse.svg"
  if [ -f "$svg_src" ]; then
    local svg_dir="${target_root}/hicolor/scalable/apps"
    mkdir -p "$svg_dir"
    cp "$svg_src" "$svg_dir/${APP_ID}.svg"
  fi
}

sync_linux() {
  echo "🐧 [SYNC-LINUX] Synchronizing Linux configurations for $APP_NAME ($APP_ID)..."

  # Clean up any lingering branch-specific files in linux/packaging/
  rm -f "$_ROOT_DIR"/linux/packaging/*.desktop
  rm -f "$_ROOT_DIR"/linux/packaging/*.metainfo.xml
  rm -rf "$_ROOT_DIR"/linux/packaging/flatpak
  rm -rf "$_ROOT_DIR"/linux/packaging/snap

  echo "✅ [SYNC-LINUX] Completed successfully!"
}

# If executed directly, run sync
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  sync_linux
fi
