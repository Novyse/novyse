import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/ui/components/window/desktop_window_controller.dart';

/// Central registry of application shortcuts, hotkeys and actions in Novyse.
abstract final class AppShortcuts {
  /// Test callback hook used to verify shortcut invocations in unit/widget tests.
  @visibleForTesting
  static VoidCallback? debugOnCloseApp;

  /// Closes the Novyse window or hides to tray based on settings and platform.
  static void closeApp(WidgetRef ref) {
    if (debugOnCloseApp != null) {
      debugOnCloseApp!();
      return;
    }

    final closeToTray =
        ref.read(settingValueProvider('system.closeToTray')) as bool? ??
        DesktopWindowController.closeToTray;
    DesktopWindowController.closeToTray = closeToTray;
    DesktopWindowController.close(hideToTray: closeToTray);

    if (!DesktopWindowController.isCustomChromeEnabled) {
      SystemNavigator.pop();
    }
  }

  /// Same as [closeApp], but operates on a [ProviderContainer] for headless contexts.
  static void closeWithContainer(ProviderContainer container) {
    if (debugOnCloseApp != null) {
      debugOnCloseApp!();
      return;
    }

    final closeToTray =
        container.read(settingValueProvider('system.closeToTray')) as bool? ??
        DesktopWindowController.closeToTray;
    DesktopWindowController.closeToTray = closeToTray;
    DesktopWindowController.close(hideToTray: closeToTray);

    if (!DesktopWindowController.isCustomChromeEnabled) {
      SystemNavigator.pop();
    }
  }
}
