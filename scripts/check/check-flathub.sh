#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$ROOT_DIR/scripts/extract-metadata.sh"

echo "🔍 [CHECK-FLATHUB] Validating Flathub metadata for $APP_NAME ($APP_ID)..."

STAGING_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGING_DIR"' EXIT

DESKTOP_FILE="$STAGING_DIR/${APP_ID}.desktop"
METAINFO_FILE="$STAGING_DIR/${APP_ID}.metainfo.xml"
MANIFEST_FILE="$STAGING_DIR/${APP_ID}.yml"

# Generate files
generate_desktop_entry "$DESKTOP_FILE"
generate_appstream_metainfo "$METAINFO_FILE"
generate_flathub_manifest "$MANIFEST_FILE" "https://github.com/Novyse/novyse/releases/download/v${APP_VERSION}/novyse.tar.gz" "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

# Check Docker requirement first
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ [ERROR] Docker is required to validate Flathub metadata, but 'docker' was not found."
  echo "   Please install Docker and ensure it is running."
  exit 1
fi

ERRORS=0

chmod -R 755 "$STAGING_DIR"
chmod 644 "$DESKTOP_FILE" "$METAINFO_FILE" "$MANIFEST_FILE"

LINTER_IMAGE="ghcr.io/flathub-infra/flatpak-builder-lint:latest"

# 1. Validate Desktop Entry (via Docker)
echo "  1️⃣  Validating Desktop file (${APP_ID}.desktop via Docker)..."
if docker run --rm --entrypoint desktop-file-validate -v "$STAGING_DIR:/src:ro,Z" "$LINTER_IMAGE" "/src/${APP_ID}.desktop"; then
  echo "     ✅ Desktop entry is valid."
else
  echo "     ❌ Desktop entry validation failed."
  ERRORS=$((ERRORS + 1))
fi

# 2. Validate AppStream Metainfo (via Docker)
echo "  2️⃣  Validating AppStream Metainfo (${APP_ID}.metainfo.xml via Docker)..."
if docker run --rm --entrypoint appstreamcli -v "$STAGING_DIR:/src:ro,Z" "$LINTER_IMAGE" validate --no-net "/src/${APP_ID}.metainfo.xml"; then
  echo "     ✅ AppStream metainfo is valid."
else
  echo "     ❌ AppStream metainfo validation failed."
  ERRORS=$((ERRORS + 1))
fi

# 3. Flathub Builder Linter (via Docker)
echo "  3️⃣  Running Flathub Linter (manifest & appstream via Docker)..."
docker run --rm -v "$STAGING_DIR:/src:ro,Z" "$LINTER_IMAGE" manifest "/src/${APP_ID}.yml" || ERRORS=$((ERRORS + 1))
docker run --rm -v "$STAGING_DIR:/src:ro,Z" "$LINTER_IMAGE" appstream "/src/${APP_ID}.metainfo.xml" || ERRORS=$((ERRORS + 1))

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "🎉 All Flathub checks passed successfully!"
else
  echo "⚠️  Found $ERRORS issue(s). Review the output above before submitting to Flathub."
  exit 1
fi
