import 'dart:io' show Directory, File, Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nativeapi_flutter/nativeapi_flutter.dart';
import 'package:novyse/core/config/global.dart';
import 'package:novyse/core/settings/settings_controller.dart';

abstract final class DesktopStartupController {

  static bool get isSupported {
    if (kIsWeb) return false;
    try {
      if (!(Platform.isWindows || Platform.isLinux || Platform.isMacOS)) {
        return false;
      }
      return LaunchAtLogin.isSupported();
    } catch (_) {
      return false;
    }
  }

  static String? get _linuxAutostartDir {
    final xdg = Platform.environment['XDG_CONFIG_HOME'];
    if (xdg != null && xdg.isNotEmpty) {
      return '$xdg/autostart';
    }
    final home = Platform.environment['HOME'];
    if (home != null && home.isNotEmpty) {
      return '$home/.config/autostart';
    }
    return null;
  }

  static String get _resolvedExecutable {
    if (Platform.isLinux) {
      final appImage = Platform.environment['APPIMAGE'];
      if (appImage != null && appImage.isNotEmpty) {
        return appImage;
      }
    }
    return Platform.resolvedExecutable;
  }

  static bool get _isLinuxEnabled {
    try {
      final dirPath = _linuxAutostartDir;
      if (dirPath == null) return false;
      final file = File('$dirPath/$appId.desktop');
      if (!file.existsSync()) return false;
      final content = file.readAsStringSync();
      if (content.contains('Hidden=true')) return false;
      if (content.contains('X-GNOME-Autostart-enabled=false')) return false;
      return true;
    } catch (e) {
      debugPrint('[DesktopStartupController] _isLinuxEnabled failed: $e');
      return false;
    }
  }

  static void _writeLinuxDesktopEntry({
    required String executable,
    required bool openInBackground,
  }) {
    try {
      final dirPath = _linuxAutostartDir;
      if (dirPath == null) return;
      final dir = Directory(dirPath);
      if (!dir.existsSync()) {
        dir.createSync(recursive: true);
      }
      final file = File('$dirPath/$appId.desktop');
      final execArgs = openInBackground ? ' --hidden' : '';
      final escapedExec =
          executable.contains(' ') ? '"$executable"' : executable;
      final content = StringBuffer()
        ..writeln('[Desktop Entry]')
        ..writeln('Type=Application')
        ..writeln('Name=$appName')
        ..writeln('GenericName=Chat & VoIP Client')
        ..writeln('Comment=$appDescription')
        ..writeln('Exec=$escapedExec$execArgs')
        ..writeln('Icon=$appId')
        ..writeln('Terminal=false')
        ..writeln('Categories=$linuxCategories')
        ..writeln('StartupWMClass=novyse')
        ..writeln('X-GNOME-Autostart-enabled=true')
        ..writeln('Hidden=false')
        ..writeln('X-KDE-autostart-after=panel');
      file.writeAsStringSync(content.toString(), flush: true);
    } catch (e) {
      debugPrint(
        '[DesktopStartupController] _writeLinuxDesktopEntry failed: $e',
      );
    }
  }

  static void _removeLinuxDesktopEntry() {
    try {
      final dirPath = _linuxAutostartDir;
      if (dirPath == null) return;
      final file = File('$dirPath/$appId.desktop');
      if (file.existsSync()) {
        file.deleteSync();
      }
    } catch (e) {
      debugPrint(
        '[DesktopStartupController] _removeLinuxDesktopEntry failed: $e',
      );
    }
  }

  static bool get isEnabled {
    if (!isSupported) return false;
    if (Platform.isLinux) {
      return _isLinuxEnabled;
    }
    LaunchAtLogin? launcher;
    try {
      launcher = LaunchAtLogin.createWithIdAndDisplayName(appId, appName);
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
      launcher = LaunchAtLogin.createWithIdAndDisplayName(appId, appName);
      if (launcher == null) return false;
      if (enabled) {
        final exec = _resolvedExecutable;
        final args = openInBackground ? ['--hidden'] : <String>[];
        if (exec.isNotEmpty) {
          launcher.setProgram(exec, args);
        }
        bool ok = false;
        try {
          ok = launcher.enable();
        } catch (_) {}
        if (Platform.isLinux) {
          _writeLinuxDesktopEntry(
            executable: exec,
            openInBackground: openInBackground,
          );
          ok = _isLinuxEnabled;
        }
        return ok;
      } else {
        bool ok = false;
        try {
          ok = launcher.disable();
        } catch (_) {}
        if (Platform.isLinux) {
          _removeLinuxDesktopEntry();
          ok = !_isLinuxEnabled;
        }
        return ok;
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

  static Future<void> sync(WidgetRef ref) async {
    if (!isSupported) return;
    try {
      final openOnStartup =
          ref.read(settingValueProvider('system.openOnStartup')) as bool? ??
          false;
      final openInBackground =
          ref.read(settingValueProvider('system.openInBackground')) as bool? ??
          false;
      await syncWithSettings(
        openOnStartup: openOnStartup,
        openInBackground: openInBackground,
      );
    } catch (e) {
      debugPrint('[DesktopStartupController] sync failed: $e');
    }
  }
}
