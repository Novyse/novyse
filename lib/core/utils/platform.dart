import 'package:flutter/foundation.dart' show kIsWeb;

import 'dart:io' as io;

/// The operating system the app is running on.
enum AppOS { android, ios, macos, linux, windows, fuchsia, web }

/// High-level platform category.
enum AppPlatform { mobile, desktop, web }

/// Detects the current [AppOS].
final AppOS currentOS = _detectOS();

/// Detects the current [AppPlatform] category.
final AppPlatform currentPlatform = _detectPlatform();

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
  return AppPlatform.desktop;
}
