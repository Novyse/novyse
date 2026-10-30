import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatFavoritesAppBar extends StatelessWidget {
  const ChatFavoritesAppBar({
    super.key,
    required this.title,
    this.subtitle = '',
    required this.onBack,
  });

  final String title;
  final String subtitle;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final content = Row(
      children: [
        FloatingPill(
          padding: FloatingConsts.iconPillPadding,
          child: FloatingIconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowLeft01),
            onPressed: onBack,
          ),
        ),
        const SizedBox(width: FloatingConsts.pillSpacing),
        Expanded(
          child: FloatingPill(
            radius: FloatingConsts.centralRadius,
            padding: FloatingConsts.iconPillPadding,
            child: Row(
              children: [
                Container(
                  width: FloatingConsts.leadingSize,
                  height: FloatingConsts.leadingSize,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: colorScheme.primary.withValues(alpha: 0.12),
                  ),
                  child: Icon(Icons.star, size: 20, color: colorScheme.primary),
                ),
                const SizedBox(width: FloatingConsts.leadingGap),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        style: FloatingConsts.titleStyle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle.isNotEmpty)
                        Text(
                          subtitle,
                          style: FloatingConsts.subtitleStyle(
                            colorScheme,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );

    return ProgressiveOpacityBackground(child: content);
  }
}
