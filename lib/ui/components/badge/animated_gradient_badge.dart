import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:novyse/ui/components/badge/badge_content.dart';
import 'package:novyse/ui/components/badge/badge_variants.dart';
import 'package:novyse/ui/components/badge/user_badge.dart';


class AnimatedGradientBadge extends StatefulWidget {
  const AnimatedGradientBadge({super.key, required this.badge});

  final UserBadge badge;

  @override
  State<AnimatedGradientBadge> createState() => _AnimatedGradientBadgeState();
}

class _AnimatedGradientBadgeState extends State<AnimatedGradientBadge>
    with TickerProviderStateMixin {
  late final AnimationController _glareController;
  late final AnimationController _flowController;

  @override
  void initState() {
    super.initState();
    _glareController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat();
    _flowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    )..repeat();
  }

  @override
  void dispose() {
    _glareController.dispose();
    _flowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = [
      for (final c in widget.badge.color.safeBgColors)
        parseBadgeHex(c, fallback: Colors.transparent),
    ];
    final textColor = widget.badge.color.textColor != null
        ? parseBadgeHex(
            widget.badge.color.textColor,
            fallback: scheme.onSurface,
          )
        : null;

    return BadgeFrame(
      borderColor: widget.badge.color.borderColor,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final rawWidth = constraints.maxWidth;
          final width = rawWidth.isFinite && rawWidth > 0 ? rawWidth : 120.0;
          return Stack(
            children: [
              // Base gradient.
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: bg,
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                    ),
                  ),
                ),
              ),
              // Color flow under the glare (60% wide, 0.4 opacity).
              AnimatedBuilder(
                animation: _flowController,
                builder: (context, child) {
                  final dx = -0.6 * width + _flowController.value * 1.4 * width;
                  return Positioned(
                    top: 0,
                    bottom: 0,
                    left: dx,
                    child: Opacity(
                      opacity: 0.4,
                      child: Container(
                        width: width * 0.6,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [bg.first, bg.last],
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
              // Light glare (30% wide, rotated 18°, 0.6 opacity).
              AnimatedBuilder(
                animation: _glareController,
                builder: (context, child) {
                  final dx = -0.8 * width + _glareController.value * 2.2 * width;
                  return Positioned(
                    top: -16,
                    bottom: -16,
                    left: dx,
                    child: Opacity(
                      opacity: 0.6,
                      child: Transform.rotate(
                        angle: 18 * math.pi / 180,
                        child: Container(
                          width: width * 0.3,
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Color.fromRGBO(255, 255, 255, 0),
                                Color.fromRGBO(255, 255, 255, 0.7),
                                Color.fromRGBO(255, 255, 255, 0),
                              ],
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
              // Content above the overlays, non-interactive.
              IgnorePointer(
                child: Padding(
                  padding: BadgeStyles.innerPadding,
                  child: BadgeContent(
                    badge: widget.badge,
                    textColor: textColor,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
