import 'package:flutter/material.dart';
import 'package:novyse/ui/components/badge/badge_content.dart';
import 'package:novyse/ui/components/badge/user_badge.dart';


class BadgeStyles {
  static const double radius = 999;
  static const EdgeInsets innerPadding = EdgeInsets.symmetric(
    horizontal: 12,
    vertical: 4,
  );
}

class BadgeFrame extends StatelessWidget {
  const BadgeFrame({
    super.key,
    required this.borderColor,
    required this.child,
  });

  final String? borderColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final border = parseBadgeHex(borderColor);
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(BadgeStyles.radius),
        border: border == Colors.transparent
            ? null
            : Border.all(color: border, width: 1),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(BadgeStyles.radius),
        child: child,
      ),
    );
  }
}

class SolidBadge extends StatelessWidget {
  const SolidBadge({super.key, required this.badge});

  final UserBadge badge;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final background = parseBadgeHex(
      badge.color.value,
      fallback: scheme.surfaceContainerHighest,
    );
    final textColor = badge.color.textColor != null
        ? parseBadgeHex(badge.color.textColor, fallback: scheme.onSurface)
        : null;
    return BadgeFrame(
      borderColor: badge.color.borderColor,
      child: ColoredBox(
        color: background,
        child: Padding(
          padding: BadgeStyles.innerPadding,
          child: BadgeContent(badge: badge, textColor: textColor),
        ),
      ),
    );
  }
}

class StaticGradientBadge extends StatelessWidget {
  const StaticGradientBadge({super.key, required this.badge});

  final UserBadge badge;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final colors = [
      for (final c in badge.color.safeBgColors)
        parseBadgeHex(c, fallback: Colors.transparent),
    ];
    final textColor = badge.color.textColor != null
        ? parseBadgeHex(badge.color.textColor, fallback: scheme.onSurface)
        : null;
    return BadgeFrame(
      borderColor: badge.color.borderColor,
      child: Stack(
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: colors,
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
              ),
            ),
          ),
          Padding(
            padding: BadgeStyles.innerPadding,
            child: BadgeContent(badge: badge, textColor: textColor),
          ),
        ],
      ),
    );
  }
}
