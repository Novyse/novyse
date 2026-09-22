import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:nativeapi/nativeapi.dart';
import 'package:novyse/ui/components/window/window_style.dart';

abstract final class DesktopWindowController {
  static bool get isCustomChromeEnabled {
    if (kIsWeb) return false;
    try {
      if (Platform.environment.containsKey('FLUTTER_TEST')) return false;
    } catch (_) {}
    try {
      if (!(Platform.isWindows || Platform.isLinux || Platform.isMacOS)) {
        return false;
      }
    } catch (_) {
      return false;
    }
    return true;
  }

  static Window? get current {
    if (kIsWeb) return null;
    try {
      return WindowManager.instance.getCurrent();
    } catch (_) {
      return null;
    }
  }

  static Future<void> init() async {
    if (!isCustomChromeEnabled) return;
    try {
      final window = WindowManager.instance.getCurrent();
      if (window == null) return;
      window.titleBarStyle = TitleBarStyle.hidden;
      window.minimumSize = WindowDefaults.minimumSize;
      window.contentSize = WindowDefaults.initialSize;
      window.center();
      window.show();
      window.focus();
    } catch (_) {}
  }

  static bool get isMaximized {
    try {
      return current?.isMaximized ?? false;
    } catch (_) {
      return false;
    }
  }

  static void minimize() {
    try {
      current?.minimize();
    } catch (_) {}
  }

  static void toggleMaximize({bool? maximized}) {
    try {
      final window = current;
      if (window == null) return;
      final isMax = maximized ?? window.isMaximized;
      if (isMax) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    } catch (_) {}
  }

  static void close({bool hideToTray = false}) {
    try {
      if (hideToTray) {
        current?.hide();
        return;
      }
      Application.instance.quit(0);
    } catch (_) {}
  }

  static void showWindow() {
    try {
      final window = current;
      if (window == null) return;
      if (!window.isVisible) window.show();
      if (window.isMinimized) window.restore();
      window.focus();
    } catch (_) {}
  }

  static void quitApp() {
    try {
      Application.instance.quit(0);
    } catch (_) {}
  }

  static void startDragging() {
    try {
      current?.startDragging();
    } catch (_) {}
  }

  static int? addMaximizedListener(void Function(bool isMaximized) onChanged) {
    try {
      final windowId = current?.id;
      return WindowManager.instance.addListener((event) {
        if (windowId != null && event.windowId != windowId) return;
        if (event is WindowMaximizedEvent) {
          onChanged(true);
        } else if (event is WindowRestoredEvent) {
          onChanged(false);
        }
      });
    } catch (_) {
      return null;
    }
  }

  static void removeMaximizedListener(int? listenerId) {
    if (listenerId == null) return;
    try {
      WindowManager.instance.removeListener(listenerId);
    } catch (_) {}
  }
}
