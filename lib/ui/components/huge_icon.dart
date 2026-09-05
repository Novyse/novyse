import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';

class AppHugeIcon extends StatelessWidget {
  const AppHugeIcon({
    super.key,
    required this.icon,
    this.size = 24,
    this.color,
    this.secondaryColor,
    this.strokeWidth = 1.5,
  });

  final List<List<dynamic>> icon;
  final double size;
  final Color? color;
  final Color? secondaryColor;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return HugeIcon(
      icon: icon,
      size: size,
      color: color ?? theme.colorScheme.onSurface,
      secondaryColor: secondaryColor,
      strokeWidth: strokeWidth,
    );
  }
}
