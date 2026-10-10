import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:novyse/ui/components/responsiveOverlay/overlay_header.dart';

class OverlayDialog extends StatelessWidget {
  const OverlayDialog({
    super.key,
    required this.title,
    this.subtitle,
    this.child,
    this.showCloseButton = true,
    this.minWidth = OverlayDialog.defaultMinWidth,
    this.maxWidth = OverlayDialog.defaultMaxWidth,
    this.maxHeightFactor = OverlayDialog.defaultMaxHeightFactor,
  });

  static const double defaultMinWidth = 320;
  static const double defaultMaxWidth = 480;
  static const double defaultMaxHeightFactor = 0.85;
  static const EdgeInsets _contentPadding = EdgeInsets.fromLTRB(24, 16, 24, 24);

  final String title;
  final String? subtitle;
  final Widget? child;
  final bool showCloseButton;
  final double minWidth;
  final double maxWidth;
  final double maxHeightFactor;

  static Future<T?> show<T>(
    BuildContext context, {
    required String title,
    String? subtitle,
    Widget? child,
    bool showCloseButton = true,
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
        title: title,
        subtitle: subtitle,
        showCloseButton: showCloseButton,
        minWidth: minWidth,
        maxWidth: maxWidth,
        maxHeightFactor: maxHeightFactor,
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);

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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: OverlayHeader(
                title: title,
                subtitle: subtitle,
                showCloseButton: showCloseButton,
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
    );
  }
}