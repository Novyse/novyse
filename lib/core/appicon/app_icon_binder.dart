import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/appicon/app_icon_catalog.dart';
import 'package:novyse/core/appicon/app_icon_service.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/utils/platform.dart';

/// Restores the desktop window/tray icon and the web favicon from settings
/// after load / changes.
///
/// Mobile platforms keep the launcher icon in the OS — no restore needed
/// (and iOS would show a system alert on every launch).
class AppIconBinder extends ConsumerStatefulWidget {
  final Widget child;

  const AppIconBinder({super.key, required this.child});

  @override
  ConsumerState<AppIconBinder> createState() => _AppIconBinderState();
}

class _AppIconBinderState extends ConsumerState<AppIconBinder> {
  String? _appliedIconId;

  void _apply(String iconId) {
    if (iconId == _appliedIconId) return;
    _appliedIconId = iconId;
    ref.read(appIconServiceProvider).applyIconId(iconId);
  }

  @override
  Widget build(BuildContext context) {
    if (isDesktop || isWeb) {
      ref.listen<Map<String, Object?>>(settingsControllerProvider, (
        previous,
        next,
      ) {
        _apply(
          next[AppIconCatalog.iconKey] as String? ??
              AppIconCatalog.defaultIconId,
        );
      });
      // ref.listen does not fire for the current value — apply once so a
      // cold start restores a non-default icon after settings settle.
      final iconId =
          ref.watch(settingsControllerProvider)[AppIconCatalog.iconKey]
              as String? ??
          AppIconCatalog.defaultIconId;
      if (iconId != _appliedIconId) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _apply(iconId);
        });
      }
    }
    return widget.child;
  }
}
