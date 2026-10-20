#!/usr/bin/env bash
#
# Builds the Flatpak manifest and bundle. The template is scaffolded by
# flutpak init at runtime and only the necessary parts are patched.
#
# Usage: linux/packaging/build-flatpak.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

for tool in flutter flatpak-builder jq curl sha256sum; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "ERROR: $tool is required to build the Flatpak." >&2
    exit 1
  }
done

source "$ROOT/scripts/extract-metadata.sh"
APP_ID="$DESKTOP_ID"
FLUTTER_REF="$(flutter --version --machine 2>/dev/null | jq -r '.frameworkVersion // empty')"
[[ -n "$FLUTTER_REF" ]] || {
  echo "ERROR: cannot determine the installed Flutter version." >&2
  exit 1
}

TMP="$ROOT/.flatpak-build"
rm -rf "$TMP"
mkdir -p "$TMP/out" "$TMP/cache" "$TMP/assets"
mkdir -p "$TMP/modules"
cat > "$TMP/modules/libass.yml" <<'YAML'
name: libass
buildsystem: autotools
config-opts:
- --disable-static
- --disable-doc
- --disable-require-system-font-provider
cleanup:
- /include
- /lib/*.la
- /lib/pkgconfig
- /share/doc
sources:
- type: archive
  url: https://github.com/libass/libass/releases/download/0.17.4/libass-0.17.4.tar.xz
  sha256: 78f1179b838d025e9c26e8fef33f8092f65611444ffa1bfc0cfac6a33511a05a
YAML
cat > "$TMP/modules/libplacebo.yml" <<'YAML'
name: libplacebo
buildsystem: meson
config-opts:
- --buildtype=release
- -Ddemos=false
- -Dtests=false
- -Dvulkan=disabled
- -Dshaderc=disabled
- -Dglslang=disabled
- -Dopengl=enabled
- -Dgl-proc-addr=enabled
- -Ddovi=disabled
- -Dlibdovi=disabled
- -Dlcms=disabled
- -Dunwind=disabled
- -Dxxhash=disabled
cleanup:
- /include
- /lib/pkgconfig
- /share/doc
sources:
- type: git
  url: https://github.com/haasn/libplacebo.git
  tag: v7.351.0
  commit: 3188549fba13bbdf3a5a98de2a38c2e71f04e21e
  x-checker-data:
    type: git
    tag-pattern: ^v([\d.]+)$
YAML
cat > "$TMP/modules/libmpv.yml" <<'YAML'
name: libmpv
buildsystem: meson
config-opts:
- --buildtype=release
- -Dlibmpv=true
- -Dcplayer=false
- -Dlua=disabled
- -Djavascript=disabled
- -Dcplugins=disabled
- -Dmanpage-build=disabled
- -Dbuild-date=false
- -Dvulkan=disabled
- -Dshaderc=disabled
- -Dx11=disabled
- -Dwayland=disabled
- -Dgl=enabled
- -Dplain-gl=enabled
- -Degl=enabled
- -Ddrm=disabled
- -Dgbm=disabled
- -Dvdpau=disabled
- -Dvaapi=disabled
- -Dcuda-hwaccel=disabled
- -Dcuda-interop=disabled
- -Djack=disabled
- -Dpipewire=disabled
- -Dsndio=disabled
- -Dcaca=disabled
- -Dsixel=disabled
- -Dopenal=disabled
- -Daaudio=disabled
- -Dlibbluray=disabled
- -Dlibarchive=disabled
- -Dlcms2=disabled
- -Duchardet=disabled
- -Dzimg=disabled
- -Drubberband=disabled
- -Dvapoursynth=disabled
- -Dspirv-cross=disabled
- -Dcdda=disabled
- -Ddvdnav=disabled
- -Ddvbin=disabled
- -Dpulse=enabled
- -Dalsa=enabled
cleanup:
- /include
- /lib/pkgconfig
- /share/doc
- /share/man
sources:
- type: archive
  url: https://github.com/mpv-player/mpv/archive/refs/tags/v0.41.0.tar.gz
  sha256: ee21092a5ee427353392360929dc64645c54479aefdb5babc5cfbb5fad626209
YAML
cat > "$TMP/app.yml" <<'YAML'
- name: novyse
  buildsystem: simple
  build-options:
    arch:
      x86_64:
        env:
          BUNDLE_PATH: build/linux/x64/release/bundle
      aarch64:
        env:
          BUNDLE_PATH: build/linux/arm64/release/bundle
    append-path: /usr/lib/sdk/llvm22/bin:/var/lib/rustup/bin:/var/lib/flutter/bin
    prepend-ld-library-path: /usr/lib/sdk/llvm22/lib
    env:
      PUB_CACHE: /run/build/novyse/.pub-cache
      CARGO_HOME: /run/build/novyse/cargo
      RUSTUP_HOME: /var/lib/rustup
      CARGO_NET_OFFLINE: 'true'
  build-commands:
  - mkdir -p .pub-cache/git/cache
  - git clone --mirror .pub-cache/git/packages-6d1ac673669f9cbc32709710b49fea8cc1b65e22
    .pub-cache/git/cache/packages-b342751d12bf48476b832db27399ed42cd2b5cae
  - git -C .pub-cache/git/cache/packages-b342751d12bf48476b832db27399ed42cd2b5cae
    remote set-url origin https://github.com/Novyse/packages.git
  - mkdir -p /app/bin
  - printf '%s\n' '#!/bin/sh' 'export RUSTUP_HOME=/var/lib/rustup' 'export CARGO_HOME=/run/build/novyse/cargo'
    'export CARGO_NET_OFFLINE=true' 'export RUSTUP_TOOLCHAIN=__RUST_VERSION__' 'if [ "$1" =
    "run" ]; then' '  shift' '  tc="$1"; shift' '  case "$tc" in stable) tc=__RUST_VERSION__
    ;; esac' '  arch=$(uname -m)' '  bin="/var/lib/rustup/toolchains/${tc}-${arch}-unknown-linux-gnu/bin"'
    '  cmd="$1"; shift' '  exec env RUSTC="$bin/rustc" "$bin/$cmd" "$@"' 'fi' 'exec
    /var/lib/rustup/bin/rustup "$@"' > /app/bin/rustup
  - chmod +x /app/bin/rustup
  - cp pubspec.lock pubspec.lock.flathub
  - flutter pub get --offline
  - mv pubspec.lock.flathub pubspec.lock
  - flutter build linux --release --no-pub
  - rm -f /app/bin/rustup
  - mkdir -p /app/novyse
  - cp -r "$BUNDLE_PATH"/. /app/novyse/
  - printf '%s\n' '#!/bin/sh' 'APP=/app/novyse' 'export LD_LIBRARY_PATH="$APP/lib:${LD_LIBRARY_PATH:-}"'
    'exec "$APP/novyse" "$@"' > /app/bin/novyse
  - chmod +x /app/bin/novyse
  - bash -c 'source scripts/extract-metadata.sh; generate_desktop_entry "/app/share/applications/${DESKTOP_ID}.desktop"
    "$DESKTOP_ID"; generate_appstream_metainfo "/app/share/metainfo/${DESKTOP_ID}.metainfo.xml"
    "$DESKTOP_ID"'
  - for s in 16 24 32 48 64 128 256 512; do install -Dm644 "linux/packaging/icons/hicolor/${s}x${s}/apps/novyse.png"
    "/app/share/icons/hicolor/${s}x${s}/apps/${FLATPAK_ID}.png"; done
  - install -Dm644 linux/packaging/icons/hicolor/scalable/apps/novyse.svg /app/share/icons/hicolor/scalable/apps/${FLATPAK_ID}.svg
  sources:
  - type: dir
    path: app
  - type: git
    url: https://github.com/Novyse/packages.git
    commit: 6d1ac673669f9cbc32709710b49fea8cc1b65e22
    dest: .pub-cache/git/packages-6d1ac673669f9cbc32709710b49fea8cc1b65e22
YAML
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

# flutpak: use an installed binary or pull the pinned release.
FLUTPAK="${FLUTPAK:-$(command -v flutpak || true)}"
if [[ -z "$FLUTPAK" ]]; then
  FLUTPAK="$TMP/flutpak"
  curl -fsSL -o "$FLUTPAK" \
    https://github.com/o-murphy/flutpak/releases/download/v0.8.6/flutpak-linux-x64
  chmod +x "$FLUTPAK"
fi

# Flutter dependencies + runtime lock extraction.
flutter pub get

# Source tree for flatpak-builder. This intentionally uses the working tree
# (not a Git commit), so local uncommitted changes are included.
mkdir -p "$TMP/app"
rsync -a \
  --exclude='.git' --exclude='build' --exclude='.dart_tool' --exclude='dist' \
  --exclude='.flatpak-build' --exclude='.cache' --exclude='.kilo' \
  --exclude='.widget_preview' --exclude='coverage' --exclude='android/.gradle' \
  ./ "$TMP/app/"
PUB_CACHE_DIR="${PUB_CACHE:-$HOME/.pub-cache}"
SN_VERSION="$(awk '
  $0 == "  super_native_extensions:" { found=1; next }
  found && /^    version:/ { gsub(/"/, "", $2); print $2; exit }
' pubspec.lock)"
FLUTTER_OPAQUE_REF="$(awk '
  $0 == "  flutter_opaque:" { found=1; next }
  found && /resolved-ref:/ { gsub(/"/, "", $2); print $2; exit }
' pubspec.lock)"
[[ -n "$SN_VERSION" && -n "$FLUTTER_OPAQUE_REF" ]] || {
  echo "ERROR: cannot resolve Rust package versions from pubspec.lock" >&2
  exit 1
}
SN_DIR="$PUB_CACHE_DIR/hosted/pub.dev/super_native_extensions-$SN_VERSION"
FO_DIR="$PUB_CACHE_DIR/git/packages-$FLUTTER_OPAQUE_REF/auth-sdk/flutter/flutter_opaque"
for f in "$SN_DIR/rust/Cargo.lock" "$FO_DIR/rust/Cargo.lock" \
         "$FO_DIR/rust_builder/cargokit/build_tool/pubspec.lock"; do
  [[ -f "$f" ]] || {
    echo "ERROR: missing $f (run flutter pub get first)" >&2
    exit 1
  }
done
cp "$SN_DIR/rust/Cargo.lock" "$TMP/cache/super_native_extensions.Cargo.lock"
cp "$FO_DIR/rust/Cargo.lock" "$TMP/cache/flutter_opaque.Cargo.lock"
cp "$FO_DIR/rust_builder/cargokit/build_tool/pubspec.lock" \
   "$TMP/cache/flutter_opaque-cargokit-build_tool.lock"

# Dynamic versions: Rust toolchain + Flutter WebRTC prebuilt binaries.
RUST_VERSION="$(awk -F= '/^channel/{gsub(/[" \t]/,"",$2); print $2; exit}' "$SN_DIR/rust/rust-toolchain.toml")"
[[ -n "$RUST_VERSION" ]] || { echo "ERROR: cannot read Rust toolchain channel" >&2; exit 1; }
sed -i "s/__RUST_VERSION__/$RUST_VERSION/g" "$TMP/app.yml"

FW_VERSION="$(awk '
  $0 == "  flutter_webrtc:" { found=1; next }
  found && /^    version:/ { gsub(/"/, "", $2); print $2; exit }
' pubspec.lock)"
[[ -n "$FW_VERSION" ]] || { echo "ERROR: cannot read flutter_webrtc version" >&2; exit 1; }
FW_DIR="$PUB_CACHE_DIR/hosted/pub.dev/flutter_webrtc-$FW_VERSION"
LIBWEBRTC_INI="$FW_DIR/third_party/libwebrtc_version.ini"
[[ -f "$LIBWEBRTC_INI" ]] || { echo "ERROR: missing $LIBWEBRTC_INI" >&2; exit 1; }
LIBWEBRTC_VERSION="$(awk -F= '/^binary_version/{gsub(/[ \t]/,"",$2); print $2}' "$LIBWEBRTC_INI")"
LIBWEBRTC_BASE="$(awk -F= '/^download_url/{gsub(/[ \t]/,"",$2); print $2}' "$LIBWEBRTC_INI")"
[[ -n "$LIBWEBRTC_VERSION" && -n "$LIBWEBRTC_BASE" ]] || {
  echo "ERROR: cannot read libwebrtc version/download URL" >&2; exit 1;
}
SHA_X64="$(curl -fsSL "$LIBWEBRTC_BASE/$LIBWEBRTC_VERSION/libwebrtc-linux-x64-release.zip.shasum" | awk '{print $1}')"
SHA_ARM64="$(curl -fsSL "$LIBWEBRTC_BASE/$LIBWEBRTC_VERSION/libwebrtc-linux-arm64-release.zip.shasum" | awk '{print $1}')"
[[ "$SHA_X64" =~ ^[0-9a-f]{64}$ && "$SHA_ARM64" =~ ^[0-9a-f]{64}$ ]] || {
  echo "ERROR: cannot fetch libwebrtc checksums" >&2; exit 1;
}

# Cargo source generator: pulled on demand, pinned by commit + sha256.
CARGO_GENERATOR="$TMP/cache/cargo_generator.py"
curl -fsSL -o "$CARGO_GENERATOR" \
  https://raw.githubusercontent.com/TheAppgineer/flatpak-flutter/9287300a470012da49bad53200c7ccf2e958979b/cargo_generator/cargo_generator.py
echo "6234e94bbc0ac96ce002505e39e9a73296f69a5cbf4841358e2512ad9b7a9e27  $CARGO_GENERATOR" \
  | sha256sum -c -

# Validation assets for flutpak (the real metadata is generated in the build).
generate_desktop_entry "$TMP/assets/$APP_ID.desktop" "$APP_ID"
generate_appstream_metainfo "$TMP/assets/$APP_ID.metainfo.xml" "$APP_ID"
mkdir -p "$TMP/assets/icons/hicolor/256x256/apps"
mkdir -p "$TMP/assets/icons/hicolor/scalable/apps"
cp linux/packaging/icons/hicolor/256x256/apps/novyse.png \
   "$TMP/assets/icons/hicolor/256x256/apps/$APP_ID.png"
cp linux/packaging/icons/hicolor/scalable/apps/novyse.svg \
   "$TMP/assets/icons/hicolor/scalable/apps/$APP_ID.svg"

cat > "$TMP/flutpak.yaml" <<YAML
app-id: $APP_ID
runtime-version: '51'
command: novyse
output: out
repo-url: https://github.com/Novyse/novyse

pub:
  locks:
    - app/pubspec.lock
    - cache/flutter_opaque-cargokit-build_tool.lock

flutter:
  ref: "$FLUTTER_REF"

metainfo-path: assets/$APP_ID.metainfo.xml
desktop-entry-path: assets/$APP_ID.desktop

icons:
  - size: 256x256
    path: assets/icons/hicolor/256x256/apps/$APP_ID.png
  - size: scalable
    path: assets/icons/hicolor/scalable/apps/$APP_ID.svg

modules:
  - $TMP/modules/libass.yml
  - $TMP/modules/libplacebo.yml
  - $TMP/modules/libmpv.yml

rust:
  version: '$RUST_VERSION'
  rustup-path: /var/lib/rustup
  locks:
    - cache/super_native_extensions.Cargo.lock
    - cache/flutter_opaque.Cargo.lock

foreign-deps:
  super_native_extensions:
    "$SN_VERSION":
      manifest:
        sources: []
  flutter_webrtc:
    "$FW_VERSION":
      manifest:
        sources:
          - type: file
            only-arches:
              - x86_64
            url: $LIBWEBRTC_BASE/$LIBWEBRTC_VERSION/libwebrtc-linux-x64-release.zip
            sha256: $SHA_X64
            dest: \$PUB_DEV/third_party/downloads
            dest-filename: libwebrtc-linux-x64-release.zip
          - type: file
            only-arches:
              - aarch64
            url: $LIBWEBRTC_BASE/$LIBWEBRTC_VERSION/libwebrtc-linux-arm64-release.zip
            sha256: $SHA_ARM64
            dest: \$PUB_DEV/third_party/downloads
            dest-filename: libwebrtc-linux-arm64-release.zip
YAML

# Scaffold the template with flutpak init, then patch only the necessary parts.
(cd "$TMP" && "$FLUTPAK" init --force) || true
TEMPLATE="$TMP/out/$APP_ID.yml"
[[ -f "$TEMPLATE" ]] || {
  echo "ERROR: flutpak init did not create $TEMPLATE" >&2
  exit 1
}
sed -i 's/^runtime:.*/runtime: org.gnome.Platform/; s/^sdk:.*/sdk: org.gnome.Sdk/' "$TEMPLATE"
sed -i 's/llvm20/llvm22/g' "$TEMPLATE"
if ! grep -q '^sdk-extensions:' "$TEMPLATE"; then
  sed -i '/^sdk:/a sdk-extensions:\n  - org.freedesktop.Sdk.Extension.llvm22' "$TEMPLATE"
fi
awk '/^finish-args:/{exit} {print}' "$TEMPLATE" > "$TMP/template.new"
cat >> "$TMP/template.new" <<'YAML'
finish-args:
  - --share=ipc
  - --socket=fallback-x11
  - --socket=wayland
  - --device=dri
  - --share=network
  - --socket=pulseaudio
  - --device=all
  - --filesystem=xdg-download
  - --filesystem=xdg-pictures
  - --filesystem=xdg-run/pipewire-0:ro
  - --talk-name=org.freedesktop.Notifications
  - --talk-name=org.kde.StatusNotifierWatcher
  - --system-talk-name=org.freedesktop.NetworkManager
YAML
echo 'modules:' >> "$TMP/template.new"
cat "$TMP/app.yml" >> "$TMP/template.new"
mv "$TMP/template.new" "$TEMPLATE"

(cd "$TMP" && "$FLUTPAK" generate)
cp "$TMP/out/generated/$APP_ID.yml" "$TMP/$APP_ID.yml"
cp "$TMP/out/generated/pubspec-sources.json" "$TMP/pubspec-sources.json"
cp "$TMP/out/generated"/rustup-*.json "$TMP/" 2>/dev/null || true

# flutpak fills the first Git source with the app HEAD. Because the app source
# is type: dir, that first Git source is actually Novyse/packages. Restore its
# pinned commit and drop the bogus tag.
APP_HEAD="$(git rev-parse HEAD)"
PACKAGES_COMMIT="6d1ac673669f9cbc32709710b49fea8cc1b65e22"
sed -i "s/commit: $APP_HEAD/commit: $PACKAGES_COMMIT/g; /tag: $APP_HEAD/d" "$TMP/$APP_ID.yml"

# Remove Flutter's patch and use the dart shim instead.
SDK_JSON="$(find "$TMP/out/generated" -maxdepth 1 -name 'flutter-sdk-*.json' | head -n 1)"
[[ -n "$SDK_JSON" ]] || {
  echo "ERROR: flutpak did not generate a flutter-sdk module." >&2
  exit 1
}
rm -rf "$TMP/out/generated/patches"
WRAPPER_LINES=(
  '#!/bin/sh'
  'REAL=/var/lib/flutter/bin/cache/dart-sdk/bin/dart.real'
  'if [ "$1" = "pub" ] && { [ "$2" = "get" ] || [ "$2" = "upgrade" ]; }; then'
  '  cmd="$2"; shift 2'
  '  case " $* " in'
  '    *" --offline "*) exec "$REAL" pub "$cmd" "$@" ;;'
  '    *) exec "$REAL" pub "$cmd" --offline "$@" ;;'
  '  esac'
  'fi'
  'exec "$REAL" "$@"'
)
C2="printf '%s\\n'"
for line in "${WRAPPER_LINES[@]}"; do
  C2+=" $(printf '%q' "$line")"
done
C2+=" > /var/lib/flutter/bin/cache/dart-sdk/bin/dart"
C1="mv /var/lib/flutter/bin/cache/dart-sdk/bin/dart /var/lib/flutter/bin/cache/dart-sdk/bin/dart.real"
C3="chmod +x /var/lib/flutter/bin/cache/dart-sdk/bin/dart"
SHIM="$(jq -n --arg c1 "$C1" --arg c2 "$C2" --arg c3 "$C3" '[$c1, $c2, $c3]')"
jq --argjson shim "$SHIM" '
  .sources = [.sources[] | select(.type != "patch")]
  | .["build-commands"] as $bc
  | ($bc | to_entries | map(select(.value | contains("cp -r flutter /var/lib"))) | .[0].key) as $i
  | .["build-commands"] = ($bc[0:$i+1] + $shim + $bc[$i+1:])
' "$SDK_JSON" > "$SDK_JSON.tmp"
mv "$SDK_JSON.tmp" "$SDK_JSON"
cp "$SDK_JSON" "$TMP/"

# Cargo sources (includes the Git-sourced mime_guess crate).
LOCKS="$TMP/cache/super_native_extensions.Cargo.lock,$TMP/cache/flutter_opaque.Cargo.lock"
if command -v uv >/dev/null 2>&1; then
  uv run --with tomlkit python "$CARGO_GENERATOR" "$LOCKS" \
    -o "$TMP/cargo-sources.json"
else
  python3 -c 'import tomlkit' 2>/dev/null || {
    echo "ERROR: python3 is missing tomlkit. Install it or install uv." >&2
    exit 1
  }
  python3 "$CARGO_GENERATOR" "$LOCKS" -o "$TMP/cargo-sources.json"
fi

REPO_DIR="$ROOT/build/flatpak-repo"
BUILD_DIR="$ROOT/build/flatpak-build"
rm -rf "$REPO_DIR" "$BUILD_DIR"
flatpak-builder --user --force-clean --sandbox --install-deps-from=flathub \
  --repo="$REPO_DIR" \
  --mirror-screenshots-url=https://dl.flathub.org/media \
  --compose-url-policy=full \
  "$BUILD_DIR" "$TMP/$APP_ID.yml"

mkdir -p "$ROOT/dist"
FLATPAK_NAME="${PKG_NAME}-${APP_VERSION}-linux.flatpak"
flatpak build-bundle "$REPO_DIR" "$ROOT/dist/$FLATPAK_NAME" "$APP_ID"
echo "✅ [FLATPAK] Created: $ROOT/dist/$FLATPAK_NAME"
