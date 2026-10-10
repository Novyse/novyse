import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/huge_icon.dart';


class OverlayHeader extends StatelessWidget {
  const OverlayHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.showCloseButton = true,
    this.onClose,
  });

  final String title;
  final String? subtitle;


  final bool showCloseButton;

  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final trimmedTitle = title.trim();
    final trimmedSubtitle = subtitle?.trim() ?? '';
    final hasSubtitle = trimmedSubtitle.isNotEmpty;

    if (trimmedTitle.isEmpty && !hasSubtitle) {
      return const SizedBox.shrink();
    }

    return Row(
      crossAxisAlignment: hasSubtitle
          ? CrossAxisAlignment.start
          : CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (trimmedTitle.isNotEmpty)
                Text(
                  trimmedTitle,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              if (hasSubtitle) ...[
                if (trimmedTitle.isNotEmpty) const SizedBox(height: 4),
                Text(
                  trimmedSubtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    height: 1.35,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (showCloseButton) ...[
          const SizedBox(width: 8),
          IconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
            tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
            onPressed:
                onClose ??
                () => Navigator.of(context, rootNavigator: true).maybePop(),
          ),
        ],
      ],
    );
  }
}