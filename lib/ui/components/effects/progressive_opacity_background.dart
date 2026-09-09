import 'package:flutter/material.dart';

enum ProgressiveOpacityDirection { topToBottom, bottomToTop }

class ProgressiveOpacityBackground extends StatelessWidget {
  const ProgressiveOpacityBackground({
    super.key,
    required this.child,
    this.fadeHeight = 0,
    this.direction = ProgressiveOpacityDirection.topToBottom,
  });

  final Widget child;
  final double fadeHeight;
  final ProgressiveOpacityDirection direction;

  @override
  Widget build(BuildContext context) {
    final surface = Theme.of(context).scaffoldBackgroundColor;
    final topToBottom = direction == ProgressiveOpacityDirection.topToBottom;

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
            ? [child, SizedBox(height: fadeHeight)]
            : [SizedBox(height: fadeHeight), child],
      ),
    );
  }
}
