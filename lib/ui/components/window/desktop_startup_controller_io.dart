import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:nativeapi/nativeapi.dart';
import 'package:novyse/core/config/global.dart';
import 'package:novyse/ui/components/window/desktop_window_controller.dart';

abstract final class DesktopStartupController {
  static const String _appId = 'novyse';

  static bool get isSupported {
    if (!DesktopWindowController.isCustomChromeEnabled) return false;
    try {
      return LaunchAtLogin.isSupported();
    } catch (_) {
      return false;
    }
  }

  static bool get isEnabled {
    if (!isSupported) return false;
    LaunchAtLogin? launcher;
    try {
      launcher = LaunchAtLogin.createWithIdAndDisplayName(_appId, appName);
      if (launcher == null) return false;
      return launcher.isEnabled;
    } catch (e) {
      debugPrint('[DesktopStartupController] isEnabled failed: $e');
      return false;
    } finally {
      launcher?.dispose();
    }
  }

  static Future<bool> setOpenOnStartup({
    required bool enabled,
    bool openInBackground = false,
  }) async {
    if (!isSupported) return false;
    LaunchAtLogin? launcher;
    try {
      launcher = LaunchAtLogin.createWithIdAndDisplayName(_appId, appName);
      if (launcher == null) return false;
      if (enabled) {
        final exec = Platform.resolvedExecutable;
        final args = openInBackground ? ['--hidden'] : <String>[];
        if (exec.isNotEmpty) {
          launcher.setProgram(exec, args);
        }
        return launcher.enable();
      } else {
        return launcher.disable();
      }
    } catch (e) {
      debugPrint('[DesktopStartupController] setOpenOnStartup failed: $e');
      return false;
    } finally {
      launcher?.dispose();
    }
  }

  static Future<void> syncWithSettings({
    required bool openOnStartup,
    required bool openInBackground,
  }) async {
    if (!isSupported) return;
    try {
      await setOpenOnStartup(
        enabled: openOnStartup,
        openInBackground: openInBackground,
      );
    } catch (e) {
      debugPrint('[DesktopStartupController] syncWithSettings failed: $e');
    }
  }
}
