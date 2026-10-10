#!/usr/bin/env bash
set -e

_THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ROOT_DIR="$(cd "$_THIS_DIR/../.." && pwd)"

# Source common metadata if not already available
if [ -z "$APP_ID" ]; then
  source "$_THIS_DIR/common.sh"
fi

export WIN_EXE_NAME="novyse.exe"
export WIN_SETUP_NAME="${PKG_NAME}-setup"
export WIN_SETUP_EXE="${PKG_NAME}-setup.exe"
export WIN_PORTABLE_NAME="${PKG_NAME}-portable.exe"
export WIN_MSI_NAME="${PKG_NAME}-setup.msi"
export WIN_ZIP_NAME="${PKG_NAME}-windows.zip"

to_win_path() {
  local p="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$p"
  elif printf '%s' "$p" | grep -Eq '^/[a-zA-Z]/'; then
    local drive rest
    drive="$(printf '%s' "$p" | cut -c2 | tr '[:lower:]' '[:upper:]')"
    rest="$(printf '%s' "$p" | cut -c3-)"
    printf '%s:%s' "$drive" "$rest"
  else
    printf '%s' "$p"
  fi
}

get_iscc_flags() {
  echo "/DMyAppName=${APP_NAME} /DMyAppVersion=${APP_VERSION} /DMyAppPublisher=${AUTHOR_NAME} /DMyAppURL=${AUTHOR_URL} /DMyAppScheme=${APP_SCHEME} /DMyAppSetupName=${WIN_SETUP_NAME}"
}

# Generate Inno Setup script on-demand
generate_inno_setup_iss() {
  local target_file="$1"
  mkdir -p "$(dirname "$target_file")"
  local win_root win_dist win_license win_icon win_bundle
  win_root="$(to_win_path "$_ROOT_DIR")"
  win_dist="$(to_win_path "$_ROOT_DIR/dist")"
  win_license="$(to_win_path "$_ROOT_DIR/LICENSE")"
  win_icon="$(to_win_path "$_ROOT_DIR/windows/runner/resources/app_icon.ico")"
  win_bundle="$(to_win_path "$_ROOT_DIR/build/windows/x64/runner/Release")"
  cat << EOF > "$target_file"
; Inno Setup Script for Novyse Windows Desktop Client (Generated on-demand)
#define MyAppName "${APP_NAME}"
#define MyAppVersion "${APP_VERSION}"
#define MyAppPublisher "${AUTHOR_NAME}"
#define MyAppURL "${AUTHOR_URL}"
#define MyAppExeName "novyse.exe"
#define MyAppScheme "${APP_SCHEME}"
#define MyAppSetupName "${WIN_SETUP_NAME}"

[Setup]
AppId={{E1D4A7F2-81F1-4A59-86BC-71D62D55A67B}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL="${AUTHOR_URL}/issues"
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
LicenseFile=${win_license}
OutputDir=${win_dist}
OutputBaseFilename={#MyAppSetupName}
SetupIconFile=${win_icon}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\\{#MyAppExeName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "italian"; MessagesFile: "compiler:Languages\\Italian.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "${win_bundle}/*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"
Name: "{group}\\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\\Classes\\{#MyAppScheme}"; ValueType: string; ValueName: ""; ValueData: "URL:{#MyAppName} Protocol"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\\Classes\\{#MyAppScheme}"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\\Classes\\{#MyAppScheme}\\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: """{app}\\{#MyAppExeName}"",0"
Root: HKCU; Subkey: "Software\\Classes\\{#MyAppScheme}\\shell\\open\\command"; ValueType: string; ValueName: ""; ValueData: """{app}\\{#MyAppExeName}"" ""%1"""

[Run]
Filename: "{app}\\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
EOF
}

# Generate WiX WXS configuration for MSI packaging on-demand
generate_wix_wxs() {
  local target_file="$1"
  mkdir -p "$(dirname "$target_file")"
  local win_ver
  win_ver=$(echo "$APP_VERSION" | cut -d'-' -f1)
  cat << EOF > "$target_file"
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" Name="${APP_NAME}" Language="1033" Version="${win_ver}" Manufacturer="${AUTHOR_NAME}" UpgradeCode="E1D4A7F2-81F1-4A59-86BC-71D62D55A67B">
    <Package InstallerVersion="200" Compressed="yes" InstallScope="perMachine" Platform="x64" />
    <MajorUpgrade DowngradeErrorMessage="A newer version of [ProductName] is already installed." />
    <MediaTemplate EmbedCab="yes" />

    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFiles64Folder">
        <Directory Id="INSTALLFOLDER" Name="${APP_NAME}" />
      </Directory>
      <Directory Id="ProgramMenuFolder" />
      <Directory Id="DesktopFolder" />
    </Directory>

    <Feature Id="ProductFeature" Title="${APP_NAME}" Level="1">
      <ComponentGroupRef Id="NovyseComponents" />
      <Component Id="ApplicationShortcuts" Directory="ProgramMenuFolder" Guid="*">
        <Shortcut Id="AppStartMenuShortcut" Name="${APP_NAME}" Description="${APP_DESCRIPTION}" Target="[INSTALLFOLDER]novyse.exe" WorkingDirectory="INSTALLFOLDER" />
        <Shortcut Id="AppDesktopShortcut" Directory="DesktopFolder" Name="${APP_NAME}" Description="${APP_DESCRIPTION}" Target="[INSTALLFOLDER]novyse.exe" WorkingDirectory="INSTALLFOLDER" />
        <RemoveFolder Id="CleanUpProgramMenuDir" Directory="ProgramMenuFolder" On="uninstall" />
        <RegistryValue Root="HKCU" Key="Software\\${APP_NAME}" Name="installed" Type="integer" Value="1" KeyPath="yes" />
      </Component>
    </Feature>
  </Product>
</Wix>
EOF
}

sync_windows() {
  echo "🪟 [SYNC-WINDOWS] Synchronizing Windows configurations for $APP_NAME ($APP_ID)..."
  echo "✅ [SYNC-WINDOWS] Completed successfully!"
}

# If executed directly, run sync
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  sync_windows
fi
