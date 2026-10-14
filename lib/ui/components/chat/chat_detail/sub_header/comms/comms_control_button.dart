import 'package:flutter/material.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Round icon button shared by the comms bottom bar and the comms sub-header bar.
class CommsControlButton extends StatelessWidget {
  const CommsControlButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.backgroundColor,
    required this.iconColor,
    required this.onPressed,
    this.size = 34,
    this.iconSize = 18,
  });

  final dynamic icon;
  final String tooltip;
  final Color backgroundColor;
  final Color iconColor;
  final VoidCallback onPressed;
  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: backgroundColor,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: size,
            height: size,
            child: Center(
              child: AppHugeIcon(icon: icon, color: iconColor, size: iconSize),
            ),
          ),
        ),
      ),
    );
  }
}
