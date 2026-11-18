import 'package:flutter/foundation.dart';
import 'package:flutter_dynamic_launcher_icon/flutter_dynamic_launcher_icon.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/appicon/app_icon_catalog.dart';
import 'package:novyse/core/appicon/app_icon_desktop.dart';
import 'package:novyse/core/utils/platform.dart';

/// Applies the selected launcher / window icon.
///
/// Platform notes:
/// - Android: request saved by the plugin and applied when the app goes to
///   background (toggling `activity-alias` would otherwise kill the
///   foreground app). Only pre-built aliases can be used.
/// - iOS: alternate icons apply immediately with a system alert.
/// - Windows / Linux / macOS: best-effort window/dock/tray update via
///   nativeapi; Linux also writes a user hicolor override. Not equivalent
///   to a permanent Start-menu / .exe resource change.
/// - Web / others: no-op (preferences are still persisted by the UI).
///
/// The backend is injectable so the draft store stays unit-testable.
class AppIconService {
  final Future<void> Function(String? alias) _changeIcon;
  final Future<String?> Function() _currentIcon;
  final Future<bool> Function() _isSupported;
  final Future<bool> Function(String iconId) _applyDesktop;

  AppIconService({
    Future<void> Function(String? alias)? changeIcon,
    Future<String?> Function()? currentIcon,
    Future<bool> Function()? isSupported,
    Future<bool> Function(String iconId)? applyDesktop,
  }) : _changeIcon =
           changeIcon ??
           ((alias) => FlutterDynamicLauncherIcon.changeIcon(alias)),
       _currentIcon =
           currentIcon ??
           (() => FlutterDynamicLauncherIcon.alternateIconName),
       _isSupported =
           isSupported ?? (() => FlutterDynamicLauncherIcon.isSupported),
       _applyDesktop = applyDesktop ?? AppIconDesktop.applyIconId;

  static bool get _isMobileDynamic =>
      currentOS == AppOS.android || currentOS == AppOS.ios;

  static bool get _isDesktopDynamic =>
      currentOS == AppOS.windows ||
      currentOS == AppOS.linux ||
      currentOS == AppOS.macos;

  /// Whether the running platform can change the visible app icon.
  Future<bool> get supportsDynamicIcons async {
    if (_isDesktopDynamic) return true;
    if (!_isMobileDynamic) return false;
    try {
      return await _isSupported();
    } catch (e) {
      debugPrint('[AppIcon] isSupported failed: $e');
      return false;
    }
  }

  /// Applies [alias] (see `AppIconCatalog.resolveAlias`); `null` resets
  /// to the system default icon. No-op on unsupported platforms; throws
  /// on native failure for mobile.
  Future<void> applyAlias(String? alias) async {
    final iconId =
        AppIconCatalog.selectionForAlias(alias) ??
        AppIconCatalog.defaultIconId;
    await applyIconId(iconId);
  }

  /// Applies the catalog glyph [iconId] on the current platform.
  Future<void> applyIconId(String iconId) async {
    if (!await supportsDynamicIcons) {
      debugPrint('[AppIcon] dynamic icons not supported, skipping $iconId');
      return;
    }
    if (_isDesktopDynamic) {
      await _applyDesktop(iconId);
      return;
    }
    final alias = AppIconCatalog.resolveAlias(iconId: iconId);
    await _changeIcon(alias);
  }

  /// Currently active mobile alias, or `null` for the default launcher icon.
  /// Desktop has no OS-reported value; returns `null`.
  Future<String?> currentAlias() async {
    if (!_isMobileDynamic) return null;
    if (!await supportsDynamicIcons) return null;
    try {
      return await _currentIcon();
    } catch (e) {
      debugPrint('[AppIcon] alternateIconName failed: $e');
      return null;
    }
  }
}

final appIconServiceProvider = Provider<AppIconService>((ref) {
  return AppIconService();
});
