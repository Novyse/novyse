import 'dart:ui';

import 'package:flutter/material.dart';

/// Shared constants for every floating pill app bar.
///
/// Used by chat detail / overview / favorites / list / search / selected
/// headers and by the settings template, so a future style tweak happens
/// once here instead of in N copy-pasted [_pill] helpers.
abstract final class FloatingAppBarConsts {
  /// Horizontal gap between the floating pills in a bar row.
  static const double pillSpacing = 12.0;

  /// Backdrop blur applied to every pill.
  static const double blurSigma = 18.0;

  /// Fill / border opacities for the glassy pill surface.
  static const double surfaceOpacity = 0.6;
  static const double borderOpacity = 0.25;

  /// Fully-rounded icon / action pills vs. the larger central pill.
  static const double pillRadius = 100.0;
  static const double centralRadius = 28.0;

  /// Outer padding of a single-icon pill (back, search, menu, ...).
  static const EdgeInsetsGeometry iconPillPadding = EdgeInsets.all(2);

  /// Outer padding of the central pill when it hosts a 40px leading
  /// (avatar / star circle). Total height: 2 + 40 + 2 = 44.
  static const EdgeInsetsGeometry centralAvatarPadding = EdgeInsets.fromLTRB(
    2,
    2,
    2,
    2,
  );

  /// Outer padding of the trailing actions pill (search, toggles, ...).
  static const EdgeInsetsGeometry actionsPadding = EdgeInsets.symmetric(
    horizontal: 2,
    vertical: 2,
  );

  /// Outer padding of the search-field central pill.
  static const EdgeInsetsGeometry searchFieldPadding = EdgeInsets.symmetric(
    horizontal: 16,
  );

  /// Outer padding of a centered-title central pill (settings).
  /// Combined with [centralMinHeight] it yields the same 44px height
  /// as the avatar pills in chat bars.
  static const EdgeInsetsGeometry centralTitlePadding = EdgeInsets.fromLTRB(
    16,
    2,
    16,
    2,
  );

  /// Minimum content height inside [centralTitlePadding] so the pill
  /// measures 44px like the chat ones.
  static const double centralMinHeight = 40.0;

  /// Size of the 40px leading (avatar / icon circle) and its gap
  /// to the title column.
  static const double leadingSize = 40.0;
  static const double leadingGap = 12.0;

  /// Vertical gap between the bar row and an optional [bottom] slot.
  static const double bottomGap = 12.0;

  /// Title / subtitle text styles shared by every central pill.
  static const TextStyle titleStyle = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w700,
  );

  static TextStyle subtitleStyle(ColorScheme scheme) =>
      TextStyle(fontSize: 12, color: scheme.onSurfaceVariant);
}

/// Glassy pill container shared by every floating app bar.
///
/// Pure skin (blur + translucent surface + border + padding): it imposes
/// no width/height of its own, so it shrink-wraps and adapts to whatever
/// [child] measures — avatar rows, text fields, centered titles, counters.
class FloatingPill extends StatelessWidget {
  const FloatingPill({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
    this.radius = FloatingAppBarConsts.pillRadius,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: FloatingAppBarConsts.blurSigma,
          sigmaY: FloatingAppBarConsts.blurSigma,
        ),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: scheme.surface.withValues(
              alpha: FloatingAppBarConsts.surfaceOpacity,
            ),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(
              color: scheme.outline.withValues(
                alpha: FloatingAppBarConsts.borderOpacity,
              ),
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}
