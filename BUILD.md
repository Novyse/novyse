# Building Novyse

All builds and packaging are executed via `./scripts/build.sh <platform> [options]`.
Outputs are generated in the `dist/` directory.

### Platforms & Supported Formats

- **Linux:**
  - **Command:** `./scripts/build.sh linux`
  - **Formats:** `tarball` (`novyse-<version>-linux.tar.gz`), `deb` (`novyse-<version>-linux.deb`), `appimage` (`novyse-<version>-linux.AppImage`), `rpm` (`novyse-<version>-linux.rpm`), `snap` (`novyse-<version>-linux.snap`), `flatpak` (`novyse-<version>-linux.flatpak`)
  - Dev: `novyse-dev-<version>-linux.deb`, ...
- **Windows:**
  - **Command:** `./scripts/build.sh windows`
  - **Formats:** `exe` (`novyse-<version>-windows-setup.exe`), `portable` (`novyse-<version>-windows-portable.exe`), `msi` (`novyse-<version>-windows-setup.msi`)
  - Dev: `novyse-dev-<version>-windows-setup.exe`, ...
- **macOS:**
  - **Command:** `./scripts/build.sh macos`
  - **Formats:** `zip` (`novyse-<version>-macos.zip`), `dmg` (`novyse-<version>-macos.dmg`)
  - Dev: `novyse-dev-<version>-macos.zip`, `novyse-dev-<version>-macos.dmg`
- **Android:**
  - **Command:** `./scripts/build.sh android`
  - **Formats:** `apk` (`novyse-<version>-android-universal.apk`, `novyse-<version>-android-<abi>.apk` per split), `aab` (`novyse-<version>-android.aab`)
  - Dev: `novyse-dev-<version>-android-universal.apk`, `novyse-dev-<version>-android.aab`
- **iOS:**
  - **Command:** `./scripts/build.sh ios`
  - **Formats:** `xcarchive` (`novyse-<version>-ios.xcarchive.zip` / `novyse-dev-<version>-ios.xcarchive.zip`)
- **Web:**
  - **Command:** `./scripts/build.sh web`
  - **Formats:** `zip` (`novyse-<version>-web.zip` / `novyse-dev-<version>-web.zip`)
- **All Platforms:**
  - **Command:** `./scripts/build.sh all`

### Format Selection Options

- `--format=<fmt>`: Build only a specific format (e.g., `./scripts/build.sh linux --format=deb`)
- `--formats=<list>`: Comma-separated list of formats (e.g., `./scripts/build.sh linux --formats=deb,appimage,rpm`)

### Platform-Specific Options

- `--apk`: _(Android)_ Shortcut to build APK only
- `--aab`: _(Android)_ Shortcut to build App Bundle only
- `--split-per-abi`: _(Android APK)_ Build split APKs per CPU architecture

### General Options

- `--release`: Build in release mode (default)
- `--debug`: Build in debug mode
- `--profile`: Build in profile mode
- `--clean`: Run `flutter clean && flutter pub get` before building
- `--skip-packaging`: Compile Flutter binaries only without packaging

---

## Verifying Release Artifacts

Every official GitHub Release includes a verification table containing the SHA-256 checksums of all distributed binaries. Use the instructions and matrix below to verify that your downloaded files are authentic, intact, and untampered.

### Verification Matrix

| Platform | Extension | Verification Type | Tool / Command |
| :--- | :--- | :--- | :--- |
| **Windows** | `.exe` (Installer & Portable) | SHA-256 Hash | `Get-FileHash -Algorithm SHA256 .\<filename>.exe` |
| **Windows** | `.msi` (Installer) | SHA-256 Hash | `Get-FileHash -Algorithm SHA256 .\<filename>.msi` |
| **Windows** | `.zip` (Portable Archive) | SHA-256 Hash | `Get-FileHash -Algorithm SHA256 .\<filename>.zip` |
| **Linux** | `.deb`, `.rpm`, `.AppImage`, `.snap`, `.flatpak`, `.tar.gz` | SHA-256 Hash | `sha256sum <filename>` |
| **macOS** | `.dmg` (Disk Image) | SHA-256 Hash | `shasum -a 256 <filename>.dmg` |
| **macOS** | `.zip` (Portable Archive) | SHA-256 Hash | `shasum -a 256 <filename>.zip` |
| **Android** | `.apk` (Direct Signed APK) | Digital Signature & SHA-256 Hash | `apksigner verify --print-certs <filename>.apk` or `sha256sum <filename>.apk` |
| **Android** | `.aab` (Play Store Bundle) | SHA-256 Hash | `sha256sum <filename>.aab` |
| **Web** | `.zip` (Web Bundle) | SHA-256 Hash | `sha256sum <filename>.zip` |

### Step-by-Step Verification Instructions

#### Windows
In PowerShell:
```powershell
Get-FileHash -Algorithm SHA256 .\novyse-<version>-windows-setup.exe
```
Compare the resulting `Hash` with the checksum listed in the release table.

#### Linux
In terminal:
```bash
sha256sum novyse-<version>-linux.deb
```
Compare the resulting hash with the release table checksum.

#### macOS
In Terminal:
```bash
shasum -a 256 novyse-<version>-macos.dmg
```
Compare the resulting hash with the release table checksum.

#### Android (Digital Signature & Checksum Verification)
Official Novyse APKs are digitally signed with the official release key:

1. **Verify Certificate Fingerprint with `apksigner` (Android SDK):**
   ```bash
   apksigner verify --print-certs novyse-<version>-android-arm64-v8a.apk
   ```
   Confirm that the `Signer #1 certificate SHA-256 digest` matches the `Android Official Signing Certificate SHA-256` shown in the release notes.

2. **Verify Certificate with Java `keytool`:**
   ```bash
   keytool -printcert -jarfile novyse-<version>-android-arm64-v8a.apk
   ```

3. **Verify File Hash:**
   ```bash
   sha256sum novyse-<version>-android-arm64-v8a.apk
   ```
