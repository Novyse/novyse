import 'package:flutter/foundation.dart';
import 'package:flutter_dynamic_launcher_icon/flutter_dynamic_launcher_icon.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/utils/platform.dart';

/// Applies the selected launcher icon through
/// `flutter_dynamic_launcher_icon`.
///
/// Platform notes:
/// - Android: the request is saved by the plugin and applied when the app
///   goes to background (toggling the `activity-alias` would otherwise
///   kill the foreground app). Only pre-built aliases can be used.
/// - iOS: alternate icons apply immediately with a system alert.
/// - Other platforms: dynamic icons are not supported; the call is a no-op
///   (preferences are still persisted by the draft store).
///
/// The backend is injectable so the draft store stays unit-testable.
class AppIconService {
  final Future<void> Function(String? alias) _changeIcon;
  final Future<String?> Function() _currentIcon;
  final Future<bool> Function() _isSupported;

  AppIconService({
    Future<void> Function(String? alias)? changeIcon,
    Future<String?> Function()? currentIcon,
    Future<bool> Function()? isSupported,
  }) : _changeIcon =
           changeIcon ??
           ((alias) => FlutterDynamicLauncherIcon.changeIcon(alias)),
       _currentIcon =
           currentIcon ??
           (() => FlutterDynamicLauncherIcon.alternateIconName),
       _isSupported =
           isSupported ?? (() => FlutterDynamicLauncherIcon.isSupported);

  /// Whether the running platform can change the launcher icon.
  Future<bool> get supportsDynamicIcons async {
    if (currentOS != AppOS.android && currentOS != AppOS.ios) return false;
    try {
      return await _isSupported();
    } catch (e) {
      debugPrint('[AppIcon] isSupported failed: $e');
      return false;
    }
  }

  /// Applies [alias] (see `AppIconCatalog.resolveAlias`); `null` resets
  /// to the system default icon. No-op on unsupported platforms; throws
  /// on native failure.
  Future<void> applyAlias(String? alias) async {
    if (!await supportsDynamicIcons) {
      debugPrint('[AppIcon] dynamic icons not supported, skipping $alias');
      return;
    }
    await _changeIcon(alias);
  }

  /// Currently active alias, or `null` for the default launcher icon.
  Future<String?> currentAlias() async {
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
