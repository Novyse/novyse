import 'package:flutter/material.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/responsiveOverlay/overlay_bottom_sheet.dart';
import 'package:novyse/ui/components/responsiveOverlay/overlay_dialog.dart';

export 'package:novyse/ui/components/responsiveOverlay/overlay_bottom_sheet.dart';
export 'package:novyse/ui/components/responsiveOverlay/overlay_confirm.dart';
export 'package:novyse/ui/components/responsiveOverlay/overlay_dialog.dart';
export 'package:novyse/ui/components/responsiveOverlay/overlay_header.dart';

/// How [ResponsiveOverlay] chooses between bottom sheet and dialog.
enum ResponsiveOverlayMode {
  /// Bottom sheet on mobile, dialog on web and desktop.
  dynamic,

  /// Always a bottom sheet.
  bottomsheet,

  /// Always a dialog.
  modal,
}
class ResponsiveOverlay {
  ResponsiveOverlay._();

  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    String? subtitle,
    ResponsiveOverlayMode mode = ResponsiveOverlayMode.dynamic,
    Widget? child,
    bool showCloseButton = true,
    double minWidth = OverlayDialog.defaultMinWidth,
    double maxWidth = OverlayDialog.defaultMaxWidth,
    double maxHeightFactor = OverlayDialog.defaultMaxHeightFactor,
    double sheetMaxWidth = OverlayBottomSheet.defaultMaxWidth,
    double sheetMaxHeightFactor = OverlayBottomSheet.defaultMaxHeightFactor,
    bool barrierDismissible = true,
    bool enableDrag = true,
    bool isDismissible = true,
  }) {
    if (_shouldUseBottomSheet(mode)) {
      return OverlayBottomSheet.show<T>(
        context,
        title: title,
        subtitle: subtitle,
        child: child,
        maxWidth: sheetMaxWidth,
        maxHeightFactor: sheetMaxHeightFactor,
        barrierDismissible: barrierDismissible,
        enableDrag: enableDrag,
        isDismissible: isDismissible,
      );
    }
    return OverlayDialog.show<T>(
      context,
      title: title,
      subtitle: subtitle,
      child: child,
      showCloseButton: showCloseButton,
      minWidth: minWidth,
      maxWidth: maxWidth,
      maxHeightFactor: maxHeightFactor,
      barrierDismissible: barrierDismissible,
    );
  }

  static bool _shouldUseBottomSheet(ResponsiveOverlayMode mode) {
    return switch (mode) {
      ResponsiveOverlayMode.bottomsheet => true,
      ResponsiveOverlayMode.modal => false,
      ResponsiveOverlayMode.dynamic => currentPlatform == AppPlatform.mobile,
    };
  }
}