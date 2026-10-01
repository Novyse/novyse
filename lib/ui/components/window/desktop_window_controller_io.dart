import 'dart:async' show Future;
import 'dart:io' show Platform, exit;
import 'dart:ui' show AppExitResponse;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart' show AppLifecycleListener;
import 'package:nativeapi/nativeapi.dart';
import 'package:novyse/ui/components/window/desktop_tray_controller.dart';
import 'package:novyse/ui/components/window/window_style.dart';

abstract final class DesktopWindowController {
  static bool closeToTray = true;
  static AppLifecycleListener? _lifecycleListener;

  static bool _forceQuit = false;

  static void _guard(String op, void Function() fn) {
    try {
      fn();
    } catch (e) {
      debugPrint('[Window] $op failed: $e');
    }
  }

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

  static void _setupLifecycleListener() {
    _lifecycleListener?.dispose();
    _lifecycleListener = AppLifecycleListener(
      onExitRequested: () async {
        if (_forceQuit) return AppExitResponse.exit;
        if (!isCustomChromeEnabled) return AppExitResponse.exit;
        if (closeToTray && DesktopTrayController.isInitialized) {
          close(hideToTray: true);
          return AppExitResponse.cancel;
        }
        return AppExitResponse.exit;
      },
    );
  }

  static Future<void> init({bool startHidden = false}) async {
    if (!isCustomChromeEnabled) return;
    try {
      _setupLifecycleListener();
      final window = WindowManager.instance.getCurrent();
      if (window == null) return;
      window.titleBarStyle = TitleBarStyle.hidden;
      window.minimumSize = WindowDefaults.minimumSize;
      window.contentSize = WindowDefaults.initialSize;
      window.center();
      if (startHidden) {
        window.hide();
      } else {
        window.show();
        window.focus();
      }
    } catch (e) {
      debugPrint('[Window] init failed: $e');
    }
  }

  static bool get isMaximized {
    try {
      return current?.isMaximized ?? false;
    } catch (_) {
      return false;
    }
  }

  static void minimize() {
    _guard('minimize', () => current?.minimize());
  }

  static void toggleMaximize({bool? maximized}) {
    _guard('toggleMaximize', () {
      final window = current;
      if (window == null) return;
      final isMax = maximized ?? window.isMaximized;
      if (isMax) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    });
  }

  static void close({bool? hideToTray}) {
    _guard('close', () {
      final shouldHide =
          hideToTray ?? (closeToTray && DesktopTrayController.isInitialized);
      if (shouldHide && DesktopTrayController.isInitialized) {
        current?.hide();
        return;
      }
      _forceQuit = true;
      if (!isCustomChromeEnabled) return;
      _guard('quit', () => Application.instance.quit(0));
      Future.delayed(
        const Duration(milliseconds: 500),
        () => _guard('exit', () => exit(0)),
      );
    });
  }

  static void showWindow() {
    _guard('showWindow', () {
      final window = current;
      if (window == null) return;
      if (!window.isVisible) window.show();
      if (window.isMinimized) window.restore();
      window.focus();
    });
  }

  static void quitApp() {
    _forceQuit = true;
    if (!isCustomChromeEnabled) return;
    _guard('quit', () => Application.instance.quit(0));
    Future.delayed(
      const Duration(milliseconds: 500),
      () => _guard('exit', () => exit(0)),
    );
  }

  static void resetForceQuitForTest() {
    _forceQuit = false;
  }

  static void startDragging() {
    _guard('startDragging', () => current?.startDragging());
  }

  static bool get isFullscreen {
    try {
      return current?.isFullScreen ?? false;
    } catch (_) {
      return false;
    }
  }

  static void setFullscreen(bool value) {
    _guard('setFullscreen', () {
      final window = current;
      if (window == null) return;
      if (window.isFullScreen == value) return;
      window.isFullScreen = value;
    });
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
    _guard(
      'removeMaximizedListener',
      () => WindowManager.instance.removeListener(listenerId),
    );
  }
}
