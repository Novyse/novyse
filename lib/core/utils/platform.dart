import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb, visibleForTesting;

/// The operating system the app is running on.
enum AppOS { android, ios, macos, linux, windows, fuchsia, web }

/// High-level platform category.
enum AppPlatform { mobile, desktop, web }

/// Distribution source used to install the running app.
enum AppInstallSource { direct, playStore, snapStore, flathub }

/// Detects the current [AppOS].
final AppOS currentOS = _detectOS();

/// Override platform for testing purposes.
@visibleForTesting
AppPlatform? debugOverridePlatform;

/// Detects the current [AppPlatform] category.
AppPlatform get currentPlatform => debugOverridePlatform ?? _detectPlatform();

/// Override install source for testing purposes.
@visibleForTesting
AppInstallSource? debugOverrideInstallSource;

/// Detects whether this installation is direct or managed by an app store.
AppInstallSource get currentInstallSource =>
    debugOverrideInstallSource ?? _detectInstallSource();

AppOS _detectOS() {
  if (kIsWeb) return AppOS.web;
  if (io.Platform.isAndroid) return AppOS.android;
  if (io.Platform.isIOS) return AppOS.ios;
  if (io.Platform.isMacOS) return AppOS.macos;
  if (io.Platform.isLinux) return AppOS.linux;
  if (io.Platform.isWindows) return AppOS.windows;
  if (io.Platform.isFuchsia) return AppOS.fuchsia;
  return AppOS.web; // fallback
}

AppPlatform _detectPlatform() {
  if (kIsWeb) return AppPlatform.web;
  if (io.Platform.isAndroid || io.Platform.isIOS) return AppPlatform.mobile;
  if (io.Platform.isMacOS || io.Platform.isWindows || io.Platform.isLinux) {
    return AppPlatform.desktop;
  }
  return AppPlatform.web;
}

AppInstallSource _detectInstallSource() {
  if (currentOS == AppOS.android) {
    const source = String.fromEnvironment('NOVYSE_INSTALL_SOURCE');
    return source == 'playStore'
        ? AppInstallSource.playStore
        : AppInstallSource.direct;
  }
  if (currentOS == AppOS.linux) {
    final environment = io.Platform.environment;
    if (environment.containsKey('SNAP') ||
        environment.containsKey('SNAP_NAME')) {
      return AppInstallSource.snapStore;
    }
    if (environment.containsKey('FLATPAK_ID') ||
        io.File('/.flatpak-info').existsSync()) {
      return AppInstallSource.flathub;
    }
  }
  return AppInstallSource.direct;
}

/// Friendly name of the current app distribution source, if store-managed.
String? get currentStoreName => switch (currentInstallSource) {
  AppInstallSource.direct => null,
  AppInstallSource.playStore => 'Google Play',
  AppInstallSource.snapStore => 'Snap Store',
  AppInstallSource.flathub => 'Flathub',
};
