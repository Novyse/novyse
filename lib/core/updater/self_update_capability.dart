library;

import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb, visibleForTesting;

import '../utils/platform.dart';
import 'updater_keys.dart';

/// Override can-self-update check for testing purposes.
@visibleForTesting
bool? debugOverrideCanSelfUpdate;

/// Linux native package kind, used to tailor the manual-update guidance.
/// Only user-writable portable installs (tarballs) support in-app updates.
enum LinuxPackageKind {
  portable,
  snap,
  flatpak,
  appimage,
  rpm,
  deb,
  systemUnknown,
}

/// What the update page should explain for the running installation.
enum InstallGuidance {
  /// No extra guidance (self-update capable install).
  none,

  /// Snap-managed: store banner plus the copyable refresh command.
  snapStore,

  /// Flatpak-managed: store banner plus the copyable update command.
  flathub,

  /// RPM install: no in-app update, download the .rpm from the website.
  linuxRpm,

  /// DEB install: no in-app update, download the .deb from the website.
  linuxDeb,

  /// AppImage: no in-app update, download and replace the file.
  linuxAppImage,

  /// Other system install: generic manual-download guidance.
  linuxSystemUnknown,

  /// macOS builds are uncertified: no in-app update.
  macOSUncertified,

  /// Install directory is not writable: no in-app update.
  readOnlyInstall,
}

/// Pure self-update rule, kept free of I/O for testability.
///
/// - macOS: always false (builds are uncertified, no privileged helper).
/// - Linux: only user-writable portable installs (tarballs).
/// - Windows: always attempted for direct desktop installs.
/// - Anything store/system managed, non-desktop, or without trusted keys:
///   always false.
bool canSelfUpdate({
  required AppPlatform platform,
  required AppOS os,
  required AppInstallSource source,
  required bool installWritable,
  required bool hasTrustedKeys,
}) {
  if (platform != AppPlatform.desktop) return false;
  if (!hasTrustedKeys) return false;
  if (source != AppInstallSource.direct) return false;
  if (os == AppOS.macos) return false;
  if (os == AppOS.linux && !installWritable) return false;
  return true;
}

/// Pure Linux package-kind resolver.
///
/// [osReleaseTokens] are the lowercased `ID_LIKE` (fallback `ID`) tokens
/// from `/etc/os-release`.
LinuxPackageKind resolveLinuxPackageKind({
  required AppInstallSource source,
  required bool isAppImage,
  required Set<String> osReleaseTokens,
}) {
  switch (source) {
    case AppInstallSource.snapStore:
      return LinuxPackageKind.snap;
    case AppInstallSource.flathub:
      return LinuxPackageKind.flatpak;
    case AppInstallSource.playStore:
    case AppInstallSource.direct:
      return LinuxPackageKind.portable;
    case AppInstallSource.systemPackage:
      break;
  }
  if (isAppImage) return LinuxPackageKind.appimage;
  const rpmFamilies = {
    'fedora',
    'rhel',
    'centos',
    'rocky',
    'alma',
    'almalinux',
    'opensuse',
    'suse',
    'sles',
    'nobara',
  };
  const debFamilies = {'debian', 'ubuntu'};
  if (osReleaseTokens.any(rpmFamilies.contains)) return LinuxPackageKind.rpm;
  if (osReleaseTokens.any(debFamilies.contains)) return LinuxPackageKind.deb;
  return LinuxPackageKind.systemUnknown;
}

/// Pure guidance resolver for the update page.
InstallGuidance resolveInstallGuidance({
  required AppOS os,
  required AppInstallSource source,
  required LinuxPackageKind linuxKind,
  required bool installWritable,
}) {
  if (os == AppOS.macos) return InstallGuidance.macOSUncertified;
  switch (source) {
    case AppInstallSource.snapStore:
      return InstallGuidance.snapStore;
    case AppInstallSource.flathub:
      return InstallGuidance.flathub;
    case AppInstallSource.systemPackage:
      if (os != AppOS.linux) return InstallGuidance.linuxSystemUnknown;
      return switch (linuxKind) {
        LinuxPackageKind.appimage => InstallGuidance.linuxAppImage,
        LinuxPackageKind.rpm => InstallGuidance.linuxRpm,
        LinuxPackageKind.deb => InstallGuidance.linuxDeb,
        _ => InstallGuidance.linuxSystemUnknown,
      };
    case AppInstallSource.playStore:
    case AppInstallSource.direct:
      break;
  }
  if (os == AppOS.linux && !installWritable) {
    return InstallGuidance.readOnlyInstall;
  }
  return InstallGuidance.none;
}

/// Reads lowercased `ID_LIKE` (fallback `ID`) tokens from `/etc/os-release`.
Set<String> readOsReleaseTokens() {
  try {
    final file = io.File('/etc/os-release');
    if (!file.existsSync()) return const {};
    var like = <String>[];
    String? id;
    for (final line in file.readAsLinesSync()) {
      if (line.startsWith('ID_LIKE=')) {
        like = _unquote(line.substring('ID_LIKE='.length))
            .split(RegExp(r'\s+'))
            .where((s) => s.isNotEmpty)
            .toList();
      } else if (line.startsWith('ID=')) {
        id = _unquote(line.substring('ID='.length));
      }
    }
    final tokens = like.isNotEmpty
        ? like
        : (id != null && id.isNotEmpty ? [id] : const <String>[]);
    return tokens.map((t) => t.toLowerCase()).toSet();
  } catch (_) {
    return const {};
  }
}

String _unquote(String value) {
  final v = value.trim();
  if (v.length >= 2 &&
      ((v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'")))) {
    return v.substring(1, v.length - 1);
  }
  return v;
}

/// Probes whether the directory containing the running executable is
/// writable by creating and deleting a temporary dotfile.
bool isInstallDirectoryWritable() {
  try {
    final exeFile = io.File(io.Platform.resolvedExecutable);
    final installDir = exeFile.parent;
    if (!installDir.existsSync()) return false;
    final probe = io.File(
      '${installDir.path}${io.Platform.pathSeparator}.updater_probe_${io.pid}',
    );
    probe.writeAsStringSync('');
    probe.deleteSync();
    return true;
  } catch (_) {
    return false;
  }
}

/// Live entry point: do not call the pure [canSelfUpdate] directly from UI.
bool canSelfUpdateInstallation() {
  if (debugOverrideCanSelfUpdate != null) {
    return debugOverrideCanSelfUpdate!;
  }
  if (kIsWeb) return false;
  return canSelfUpdate(
    platform: currentPlatform,
    os: currentOS,
    source: currentInstallSource,
    // Windows always attempts (per policy); the writability gate applies
    // to Linux portable installs only.
    installWritable:
        currentOS != AppOS.linux || isInstallDirectoryWritable(),
    hasTrustedKeys: trustedReleasePublicKeys.isNotEmpty,
  );
}

/// Live Linux package-kind detection (reads env + `/etc/os-release`).
LinuxPackageKind detectLinuxPackageKind() {
  return resolveLinuxPackageKind(
    source: currentInstallSource,
    isAppImage: io.Platform.environment.containsKey('APPIMAGE'),
    osReleaseTokens: currentOS == AppOS.linux
        ? readOsReleaseTokens()
        : const {},
  );
}
