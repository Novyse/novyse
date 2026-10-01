import 'package:flutter/foundation.dart';
import 'package:nativeapi/nativeapi.dart';
import 'package:novyse/core/config/global.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/window/desktop_window_controller.dart';
import 'package:novyse/ui/components/window/window_style.dart';

abstract final class DesktopTrayController {
  static TrayIcon? _trayIcon;
  static Menu? _menu;
  static MenuItem? _openItem;
  static MenuItem? _closeItem;
  static int? _listenerId;

  static bool get isInitialized => _trayIcon != null;

  static Future<void> init() async {
    if (!DesktopWindowController.isCustomChromeEnabled) return;
    if (_trayIcon != null) return;
    try {
      if (!TrayManager.instance.isSupported()) return;
    } catch (_) {
      return;
    }
    try {
      final l10n = lookupAppL10n();
      final trayIcon = TrayIcon.create();
      if (trayIcon == null) return;
      trayIcon.setTooltip(appName);

      final menu = Menu.create();
      if (menu == null) {
        trayIcon.dispose();
        return;
      }
      if (Menu.isBackendSupported(MenuBackend.winUi3)) {
        menu.setBackend(MenuBackend.winUi3);
      }
      final openItem =
          MenuItem.createWithLabelAndType(l10n.trayOpen, MenuItemType.normal);
      final closeItem =
          MenuItem.createWithLabelAndType(l10n.trayClose, MenuItemType.normal);
      if (openItem == null || closeItem == null) {
        openItem?.dispose();
        closeItem?.dispose();
        menu.dispose();
        trayIcon.dispose();
        return;
      }
      openItem.addListener((event) {
        if (event is MenuItemClickedEvent) {
          DesktopWindowController.showWindow();
        }
      });
      closeItem.addListener((event) {
        if (event is MenuItemClickedEvent) {
          DesktopWindowController.quitApp();
        }
      });
      menu.addItem(openItem);
      menu.addItem(closeItem);
      trayIcon.setContextMenu(menu);
      // Temporary fix @SamueleOrazioDurante for Linux: right click is not working, so we use left click to open the menu
      trayIcon.setContextMenuTrigger(
        currentOS == AppOS.linux
            ? ContextMenuTrigger.clicked
            : ContextMenuTrigger.rightClicked,
      );
      _listenerId = trayIcon.addListener((event) {
        if (event is TrayIconClickedEvent ||
            event is TrayIconDoubleClickedEvent) {
          DesktopWindowController.showWindow();
        }
      });
      trayIcon.setVisible(true);
      final icon = ImageAsset.fromAsset(WindowDefaults.trayIconAsset);
      if (icon != null) trayIcon.icon = icon;

      _trayIcon = trayIcon;
      _menu = menu;
      _openItem = openItem;
      _closeItem = closeItem;
    } catch (e) {
      debugPrint('[Tray] init failed: $e');
      await dispose();
    }
  }

  static void refreshLabels() {
    _guard('refreshLabels', () {
      final l10n = lookupAppL10n();
      _openItem?.label = l10n.trayOpen;
      _closeItem?.label = l10n.trayClose;
      _trayIcon?.setTooltip(appName);
    });
  }

  static void _guard(String op, void Function() fn) {
    try {
      fn();
    } catch (e) {
      debugPrint('[Tray] $op failed: $e');
    }
  }

  static Future<void> dispose() async {
    _guard('removeListener', () {
      if (_listenerId != null && _trayIcon != null) {
        _trayIcon!.removeListener(_listenerId!);
      }
    });
    _guard('disposeOpenItem', () => _openItem?.dispose());
    _guard('disposeCloseItem', () => _closeItem?.dispose());
    _guard('disposeMenu', () => _menu?.dispose());
    _guard('disposeTray', () => _trayIcon?.dispose());
    _listenerId = null;
    _openItem = null;
    _closeItem = null;
    _menu = null;
    _trayIcon = null;
  }
}
