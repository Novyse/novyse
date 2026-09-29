import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Styled modal dialog. Visual tokens live in [ThemeData.dialogTheme].
///
/// Plain [Dialog] has no max-width constraint (only `insetPadding`), so on
/// wide screens it stretches to almost full width. This wrapper enforces a
/// [minWidth]/[maxWidth] and a [maxHeightFactor] relative to screen height
/// to keep modals compact and homogeneous.
class OverlayDialog extends StatelessWidget {
  const OverlayDialog({
    super.key,
    this.child,
    this.minWidth = OverlayDialog.defaultMinWidth,
    this.maxWidth = OverlayDialog.defaultMaxWidth,
    this.maxHeightFactor = OverlayDialog.defaultMaxHeightFactor,
  });

  static const double defaultMinWidth = 320;
  static const double defaultMaxWidth = 480;
  static const double defaultMaxHeightFactor = 0.85;

  final Widget? child;
  final double minWidth;
  final double maxWidth;
  final double maxHeightFactor;

  static Future<T?> show<T>(
    BuildContext context, {
    Widget? child,
    double minWidth = defaultMinWidth,
    double maxWidth = defaultMaxWidth,
    double maxHeightFactor = defaultMaxHeightFactor,
    bool barrierDismissible = true,
  }) {
    return showDialog<T>(
      context: context,
      useRootNavigator: true,
      barrierDismissible: barrierDismissible,
      builder: (context) => OverlayDialog(
        minWidth: minWidth,
        maxWidth: maxWidth,
        maxHeightFactor: maxHeightFactor,
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.sizeOf(context);

    // Keep at least 24px margin per side on small screens.
    final effectiveMaxWidth = math.min(
      maxWidth,
      math.max(0.0, size.width - 48),
    );
    final effectiveMinWidth = math.min(minWidth, effectiveMaxWidth);
    final effectiveMaxHeight = size.height * maxHeightFactor.clamp(0.1, 1.0);

    return Dialog(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minWidth: effectiveMinWidth,
          maxWidth: effectiveMaxWidth,
          minHeight: 0,
          maxHeight: effectiveMaxHeight,
        ),
        // Scrolling lives here so callers just provide a Column(min).
        // Wraps small content, scrolls tall content.
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child:
                child ??
                Text(
                  'Empty',
                  style: theme.textTheme.bodyLarge,
                  textAlign: TextAlign.center,
                ),
          ),
        ),
      ),
    );
  }
}
