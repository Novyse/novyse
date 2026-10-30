import 'package:flutter/material.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Round icon button used by the comms sub-header bar. Sizes come straight
/// from [FloatingConsts]: 24 glyph in a 42 box, like every app bar.
class CommsControlButton extends StatelessWidget {
  const CommsControlButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.backgroundColor,
    required this.iconColor,
    required this.onPressed,
  });

  final dynamic icon;
  final String tooltip;
  final Color backgroundColor;
  final Color iconColor;
  final VoidCallback onPressed;

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
            width: FloatingConsts.barContentSize,
            height: FloatingConsts.barContentSize,
            child: Center(
              child: AppHugeIcon(
                icon: icon,
                color: iconColor,
                size: FloatingConsts.barIconSize,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
