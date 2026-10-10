import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:novyse/ui/components/responsiveOverlay/overlay_header.dart';

class OverlayBottomSheet extends StatelessWidget {
  const OverlayBottomSheet({
    super.key,
    required this.title,
    this.subtitle,
    this.child,
    this.maxWidth = OverlayBottomSheet.defaultMaxWidth,
    this.maxHeightFactor = OverlayBottomSheet.defaultMaxHeightFactor,
  });

  static const double defaultMaxWidth = 560;
  static const double defaultMaxHeightFactor = 0.75;
  static const EdgeInsets _contentPadding = EdgeInsets.fromLTRB(16, 16, 16, 16);

  final String title;
  final String? subtitle;
  final Widget? child;
  final double maxWidth;
  final double maxHeightFactor;

  static Future<T?> show<T>(
    BuildContext context, {
    required String title,
    String? subtitle,
    Widget? child,
    double maxWidth = defaultMaxWidth,
    double maxHeightFactor = defaultMaxHeightFactor,
    bool barrierDismissible = true,
    bool enableDrag = true,
    bool isDismissible = true,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      // SafeArea is handled manually in build (top: false) to avoid
      // double bottom insets.
      useSafeArea: false,
      isDismissible: isDismissible && barrierDismissible,
      enableDrag: enableDrag,
      builder: (sheetContext) => OverlayBottomSheet(
        title: title,
        subtitle: subtitle,
        maxWidth: maxWidth,
        maxHeightFactor: maxHeightFactor,
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final viewInsetsBottom = MediaQuery.viewInsetsOf(context).bottom;

    final effectiveMaxWidth = math.min(maxWidth, size.width);
    final effectiveMaxHeight = size.height * maxHeightFactor.clamp(0.1, 1.0);

    // Adaptive height: wraps content, scrolls when taller than maxHeight.
    // NOTE: no Align/Center here on purpose: they expand to the incoming
    // maxHeight (full screen with isScrollControlled) and force the sheet
    // itself to full height. A Row wraps the child's height instead.
    return Padding(
      padding: EdgeInsets.only(bottom: viewInsetsBottom),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Flexible(
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: effectiveMaxWidth,
                  maxHeight: effectiveMaxHeight,
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                        child: OverlayHeader(
                          title: title,
                          subtitle: subtitle,
                          showCloseButton: false,
                        ),
                      ),
                      Flexible(
                        child: Padding(
                          padding: _contentPadding,
                          child: SingleChildScrollView(
                            child: child ?? const SizedBox.shrink(),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}