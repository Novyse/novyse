import 'package:flutter/material.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/responsiveOverlay/overlay_bottom_sheet.dart';
import 'package:novyse/ui/components/responsiveOverlay/overlay_dialog.dart';

export 'package:novyse/ui/components/responsiveOverlay/overlay_bottom_sheet.dart';
export 'package:novyse/ui/components/responsiveOverlay/overlay_dialog.dart';

/// How [ResponsiveOverlay] chooses between bottom sheet and dialog.
enum ResponsiveOverlayMode {
  /// Bottom sheet on mobile, dialog on web and desktop.
  dynamic,

  /// Always a bottom sheet.
  bottomsheet,

  /// Always a dialog.
  modal,
}

/// App entry point for overlays. Delegates to [OverlayBottomSheet] or [OverlayDialog].
class ResponsiveOverlay {
  ResponsiveOverlay._();

  static Future<T?> show<T>({
    required BuildContext context,
    ResponsiveOverlayMode mode = ResponsiveOverlayMode.dynamic,
    Widget? child,
  }) {
    if (_shouldUseBottomSheet(mode)) {
      return OverlayBottomSheet.show<T>(context, child: child);
    }
    return OverlayDialog.show<T>(context, child: child);
  }

  static bool _shouldUseBottomSheet(ResponsiveOverlayMode mode) {
    return switch (mode) {
      ResponsiveOverlayMode.bottomsheet => true,
      ResponsiveOverlayMode.modal => false,
      ResponsiveOverlayMode.dynamic => currentPlatform == AppPlatform.mobile,
    };
  }
}
