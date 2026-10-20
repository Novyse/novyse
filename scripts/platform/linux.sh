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
MimeType=x-scheme-handler/novyse;x-scheme-handler/novyse.preview;x-scheme-handler/novyse.dev;
StartupWMClass=novyse
SingleMainWindow=true
EOF
}

# Generate AppStream metadata on-demand
generate_appstream_metainfo() {
  local target_file="$1"
  local APP_ID="${2:-$APP_ID}"
  mkdir -p "$(dirname "$target_file")"
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
    <mediatype>x-scheme-handler/novyse</mediatype>
  </provides>
</component>
EOF
}

# Generate Flatpak manifest on-demand
generate_flatpak_manifest() {
  local target_file="$1"
  local source_dir="${2:-.}"
  local FLATHUB_APP_ID="${3:-$FLATHUB_APP_ID}"
  mkdir -p "$(dirname "$target_file")"
  cat << EOF > "$target_file"
app-id: ${FLATHUB_APP_ID}
runtime: org.freedesktop.Platform
runtime-version: "26.08"
sdk: org.freedesktop.Sdk
command: novyse
separate-locales: false

finish-args:
  - --socket=fallback-x11
  - --socket=wayland
  - --share=ipc
  - --share=network
  - --device=dri
  - --socket=pulseaudio
  - --talk-name=org.freedesktop.Notifications
  - --talk-name=org.kde.StatusNotifierWatcher
  - --talk-name=com.canonical.AppMenu.Registrar
  - --filesystem=xdg-download
  - --filesystem=xdg-pictures

modules:
  - name: novyse
    buildsystem: simple
    build-commands:
      - mkdir -p /app/bin /app/lib /app/data
      - cp -R bundle/* /app/
      - install -Dm755 bundle/novyse /app/bin/novyse
      - install -Dm644 ${FLATHUB_APP_ID}.desktop /app/share/applications/${FLATHUB_APP_ID}.desktop
      - install -Dm644 ${FLATHUB_APP_ID}.metainfo.xml /app/share/metainfo/${FLATHUB_APP_ID}.metainfo.xml
      - mkdir -p /app/share/icons/hicolor
      - cp -R icons/hicolor/* /app/share/icons/hicolor/
    sources:
      - type: dir
        path: ${source_dir}
EOF
}

# Generate Flathub release manifest on-demand
generate_flathub_manifest() {
  local target_file="$1"
  local tarball_url="$2"
  local tarball_sha256="$3"
  local FLATHUB_APP_ID="${4:-$FLATHUB_APP_ID}"
  mkdir -p "$(dirname "$target_file")"
  cat << EOF > "$target_file"
app-id: ${FLATHUB_APP_ID}
runtime: org.freedesktop.Platform
runtime-version: "26.08"
sdk: org.freedesktop.Sdk
command: novyse
separate-locales: false

finish-args:
  - --socket=fallback-x11
  - --socket=wayland
  - --share=ipc
  - --share=network
  - --device=dri
  - --socket=pulseaudio
  - --talk-name=org.freedesktop.Notifications
  - --talk-name=org.kde.StatusNotifierWatcher
  - --talk-name=com.canonical.AppMenu.Registrar
  - --filesystem=xdg-download
  - --filesystem=xdg-pictures

modules:
  - name: novyse
    buildsystem: simple
    build-commands:
      - mkdir -p /app/bin /app/lib /app/data
      - cp -R * /app/
      - install -Dm755 novyse /app/bin/novyse
      - install -Dm644 ${FLATHUB_APP_ID}.desktop /app/share/applications/${FLATHUB_APP_ID}.desktop
      - install -Dm644 ${FLATHUB_APP_ID}.metainfo.xml /app/share/metainfo/${FLATHUB_APP_ID}.metainfo.xml
      - mkdir -p /app/share/icons/hicolor
      - cp -R icons/hicolor/* /app/share/icons/hicolor/
    sources:
      - type: archive
        url: ${tarball_url}
        sha256: ${tarball_sha256}
      - type: file
        path: ${FLATHUB_APP_ID}.desktop
      - type: file
        path: ${FLATHUB_APP_ID}.metainfo.xml
      - type: dir
        path: icons
EOF
}

# Generate Snapcraft configuration on-demand
generate_snapcraft_yaml() {
  local target_file="$1"
  local source_path="${2:-bundle}"
  mkdir -p "$(dirname "$target_file")"
  cat << EOF > "$target_file"
name: ${PKG_NAME}
base: core24
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
