import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:nativeapi/nativeapi.dart';
import 'package:novyse/core/appicon/app_icon_bundle.dart';
import 'package:novyse/core/appicon/app_icon_catalog.dart';
import 'package:novyse/core/config/global.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/window/desktop_tray_controller.dart';
import 'package:novyse/ui/components/window/desktop_window_controller.dart';
import 'package:path/path.dart' as path;

/// Best-effort desktop icon apply (window / dock / tray / Linux theme).
///
/// White/dark keep the base Novyse logo. Themed glyphs (`appliesOnDesktop`)
/// swap in their cutout artwork (e.g. sakura-filled "N").
abstract final class AppIconDesktop {
  static Future<bool> applyIconId(String iconId) async {
    if (!DesktopWindowController.isCustomChromeEnabled) return false;
    final glyph = AppIconCatalog.glyphById(iconId);
    final themed = glyph.appliesOnDesktop;
    final pngAsset = themed
        ? (glyph.desktopAsset ?? glyph.asset)
        : AppIconCatalog.desktopBaseAsset;
    final winAsset = themed
        ? (glyph.desktopIcoAsset ?? AppIconCatalog.desktopBaseIcoAsset)
        : AppIconCatalog.desktopBaseIcoAsset;
    final asset = Platform.isWindows ? winAsset : pngAsset;
    final filePath = AppIconBundle.resolveAssetPath(asset);
    if (filePath == null) {
      debugPrint('[AppIconDesktop] missing asset on disk: $asset');
      return false;
    }
    debugPrint(
      '[AppIconDesktop] apply id=$iconId themed=$themed → $asset',
    );

    var ok = false;
    try {
      ok = Application.instance.setIcon(filePath);
      if (!ok) {
        debugPrint('[AppIconDesktop] setIcon failed for $filePath');
      }
    } catch (e) {
      debugPrint('[AppIconDesktop] setIcon threw: $e');
    }

    DesktopTrayController.setIconAsset(pngAsset);

    if (currentOS == AppOS.linux) {
      await _applyLinuxLauncherIcon(pngAsset);
    }
    return ok;
  }

  /// Overwrites the user-local hicolor icon named [desktopId] so launchers
  /// that read `Icon=<desktopId>` pick up the selection after a cache refresh.
  static Future<void> _applyLinuxLauncherIcon(String pngAsset) async {
    final source = AppIconBundle.resolveAssetPath(pngAsset);
    if (source == null) return;
    final home = Platform.environment['HOME'];
    if (home == null || home.isEmpty) return;

    final sizes = [64, 128, 256, 512];
    try {
      for (final size in sizes) {
        final destDir = Directory(
          path.join(
            home,
            '.local',
            'share',
            'icons',
            'hicolor',
            '${size}x$size',
            'apps',
          ),
        );
        destDir.createSync(recursive: true);
        final dest = File(path.join(destDir.path, '$desktopId.png'));
        await File(source).copy(dest.path);
      }
    } catch (e) {
      debugPrint('[AppIconDesktop] linux hicolor write failed: $e');
      return;
    }

    try {
      await Process.run('gtk-update-icon-cache', [
        '-f',
        '-t',
        path.join(home, '.local', 'share', 'icons', 'hicolor'),
      ]);
    } catch (_) {}
    try {
      await Process.run('xdg-icon-resource', ['forceupdate']);
    } catch (_) {}
  }
}
