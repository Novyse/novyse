import 'package:flutter/material.dart';

enum ProgressiveOpacityDirection { topToBottom, bottomToTop }

/// Floating-bar backdrop with a fading gradient.
///
/// Owns the [SafeArea] + outer [padding] so every floating bar (appbars,
/// tab bar) shares the same insets without repeating them at each call site.
/// Defaults are direction-aware:
/// - [ProgressiveOpacityDirection.topToBottom] -> `fromLTRB(12, 12, 12, 0)`
/// - [ProgressiveOpacityDirection.bottomToTop] -> `fromLTRB(12, 0, 12, 12)`
class ProgressiveOpacityBackground extends StatelessWidget {
  const ProgressiveOpacityBackground({
    super.key,
    required this.child,
    this.fadeHeight = 0,
    this.direction = ProgressiveOpacityDirection.topToBottom,
    this.padding,
    this.applySafeArea = true,
  });

  final Widget child;
  final double fadeHeight;
  final ProgressiveOpacityDirection direction;

  /// Outer insets around [child]. When null, a direction-aware default is
  /// used (see class docs).
  final EdgeInsetsGeometry? padding;

  /// Whether to wrap [child] in a [SafeArea] (top for top bars, bottom for
  /// bottom bars). Set to false if the child already handles insets itself.
  final bool applySafeArea;

  EdgeInsetsGeometry get _effectivePadding {
    if (padding != null) return padding!;
    return switch (direction) {
      ProgressiveOpacityDirection.topToBottom => const EdgeInsets.fromLTRB(
        12,
        12,
        12,
        0,
      ),
      ProgressiveOpacityDirection.bottomToTop => const EdgeInsets.fromLTRB(
        12,
        0,
        12,
        12,
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    final surface = Theme.of(context).scaffoldBackgroundColor;
    final topToBottom = direction == ProgressiveOpacityDirection.topToBottom;

    Widget inner = Padding(padding: _effectivePadding, child: child);
    if (applySafeArea) {
      inner = SafeArea(top: topToBottom, bottom: !topToBottom, child: inner);
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: topToBottom ? Alignment.topCenter : Alignment.bottomCenter,
          end: topToBottom ? Alignment.bottomCenter : Alignment.topCenter,
          colors: [surface, surface.withValues(alpha: 0)],
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: topToBottom
            ? [inner, SizedBox(height: fadeHeight)]
            : [SizedBox(height: fadeHeight), inner],
      ),
    );
  }
}
