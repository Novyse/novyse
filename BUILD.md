# Building Novyse

All builds and packaging are executed via `./scripts/build.sh <platform> [options]`.
Outputs are generated in the `dist/` directory.

### Platforms & Supported Formats

- **Linux:**
  - **Command:** `./scripts/build.sh linux`
  - **Formats:** `tarball` (`.tar.gz`), `deb` (`.deb`), `appimage` (`.AppImage`), `rpm` (`.rpm`), `snap` (`.snap`), `flatpak` (`.flatpak`)
- **Windows:**
  - **Command:** `./scripts/build.sh windows`
  - **Formats:** `zip` (`.zip`), `exe` (`-Setup.exe`), `portable` (`-Portable.exe`), `msi` (`-Setup.msi`)
- **macOS:**
  - **Command:** `./scripts/build.sh macos`
  - **Formats:** `zip` (`.zip`), `dmg` (`.dmg`)
- **Android:**
  - **Command:** `./scripts/build.sh android`
  - **Formats:** `apk` (`.apk`), `aab` (`.aab`)
- **iOS:**
  - **Command:** `./scripts/build.sh ios`
  - **Formats:** `xcarchive` (`.xcarchive.zip`)
- **Web:**
  - **Command:** `./scripts/build.sh web`
  - **Formats:** `zip` (`.zip`)
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
Get-FileHash -Algorithm SHA256 .\Novyse-Setup.exe
```
Compare the resulting `Hash` with the checksum listed in the release table.

#### Linux
In terminal:
```bash
sha256sum novyse.deb
```
Compare the resulting hash with the release table checksum.

#### macOS
In Terminal:
```bash
shasum -a 256 Novyse.dmg
```
Compare the resulting hash with the release table checksum.

#### Android (Digital Signature & Checksum Verification)
Official Novyse APKs are digitally signed with the official release key:

1. **Verify Certificate Fingerprint with `apksigner` (Android SDK):**
   ```bash
   apksigner verify --print-certs novyse.apk
   ```
   Confirm that the `Signer #1 certificate SHA-256 digest` matches the `Android Official Signing Certificate SHA-256` shown in the release notes.

2. **Verify Certificate with Java `keytool`:**
   ```bash
   keytool -printcert -jarfile novyse.apk
   ```

3. **Verify File Hash:**
   ```bash
   sha256sum novyse.apk
   ```
