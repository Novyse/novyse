import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';

class AppMenuShell extends StatelessWidget {
  const AppMenuShell({
    super.key,
    required this.child,
    this.width,
    this.padding = const EdgeInsets.all(AppMenuTokens.padding),
  });

  final Widget child;
  final double? width;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppMenuTokens.borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: AppMenuTokens.blurSigma,
          sigmaY: AppMenuTokens.blurSigma,
        ),
        child: Container(
          width: width,
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(
              alpha: AppMenuTokens.cardOpacity,
            ),
            borderRadius: BorderRadius.circular(AppMenuTokens.borderRadius),
            border: Border.all(
              color: colorScheme.outlineVariant.withValues(
                alpha: AppMenuTokens.borderOpacity,
              ),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          // Transparent Material so InkWell/Slider descendants (rendered in
          // a root Overlay without a Scaffold) still have an ink ancestor.
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(AppMenuTokens.borderRadius),
            clipBehavior: Clip.antiAlias,
            child: Padding(padding: padding, child: child),
          ),
        ),
      ),
    );
  }
}

/// Visual tokens shared by every context menu.
abstract final class AppMenuTokens {
  static const double borderRadius = 25.0;
  static const double padding = 10.0;
  static const double blurSigma = 20.0;
  static const double cardOpacity = 0.88;
  static const double borderOpacity = 0.35;
  static const double edgePadding = 10.0;
  static const double itemHeight = 44.0;
}

/// Same math as production `getContextMenuPosition`: clamp to the overlay
/// and flip above the anchor when there is no room below.
Offset resolveAppMenuPosition({
  required Offset anchor,
  required Size overlaySize,
  required double width,
  double? estimatedHeight,
  double edgePadding = AppMenuTokens.edgePadding,
}) {
  var x = anchor.dx;
  var y = anchor.dy;

  if (x + width > overlaySize.width - edgePadding) {
    x = overlaySize.width - width - edgePadding;
  }
  if (x < edgePadding) x = edgePadding;

  if (estimatedHeight != null &&
      y + estimatedHeight > overlaySize.height - edgePadding) {
    y = y - estimatedHeight;
    if (y < edgePadding) y = edgePadding;
  }

  return Offset(x, y);
}

/// Anchored overlay used by every context menu (messages, vocal tiles,
/// future menus). Transparent backdrop, closes on tap / right-click.
///
/// [builder] receives [close] so rows that navigate away (pin, fullscreen,
/// open profile…) can dismiss the menu first. Rows that must keep the menu
/// open (e.g. local mute toggle) simply ignore it.
Future<void> showAppMenu({
  required BuildContext context,
  required Offset anchor,
  required double width,
  double? estimatedHeight,
  Widget? header,
  Widget? footer,
  required Widget Function(VoidCallback close) builder,
  double headerGap = AppMenuTokens.padding,
  double footerGap = 8.0,
}) {
  final overlay = Overlay.of(context, rootOverlay: true);
  final renderBox = overlay.context.findRenderObject();
  final overlaySize = renderBox is RenderBox && renderBox.hasSize
      ? renderBox.size
      : MediaQuery.sizeOf(context);

  final position = resolveAppMenuPosition(
    anchor: anchor,
    overlaySize: overlaySize,
    width: width,
    estimatedHeight: estimatedHeight,
  );

  final completer = Completer<void>();
  var closed = false;
  late final OverlayEntry entry;

  void close() {
    if (closed) return;
    closed = true;
    try {
      entry.remove();
    } catch (_) {}
    if (!completer.isCompleted) completer.complete();
  }

  entry = OverlayEntry(
    builder: (entryContext) => Stack(
      children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: close,
          onSecondaryTapUp: (_) => close(),
          child: const SizedBox.expand(),
        ),
        Positioned(
          left: position.dx,
          top: position.dy,
          width: width,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (header != null) ...[header, SizedBox(height: headerGap)],
              AppMenuShell(width: width, child: builder(close)),
              if (footer != null) ...[SizedBox(height: footerGap), footer],
            ],
          ),
        ),
      ],
    ),
  );

  overlay.insert(entry);
  return completer.future;
}
