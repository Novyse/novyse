import 'package:flutter/material.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class AppMenuItem extends StatelessWidget {
  const AppMenuItem({
    super.key,
    required this.label,
    this.icon,
    this.onTap,
    this.isDanger = false,
    this.enabled = true,
  });

  final String label;
  final List<List<dynamic>>? icon;
  final VoidCallback? onTap;
  final bool isDanger;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final itemColor = isDanger ? colorScheme.error : colorScheme.onSurface;
    final interactive = enabled && onTap != null;

    final content = Container(
      height: AppMenuTokens.itemHeight,
      padding: const EdgeInsets.symmetric(horizontal: AppMenuTokens.padding),
      child: Row(
        children: [
          if (icon != null) ...[
            AppHugeIcon(icon: icon!, size: 20, color: itemColor),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Text(
              label,
              style:
                  theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                    color: itemColor,
                  ) ??
                  TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: itemColor,
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );

    if (!interactive) {
      return Opacity(opacity: enabled ? 1.0 : 0.5, child: content);
    }

    return Opacity(
      opacity: enabled ? 1.0 : 0.5,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(AppMenuTokens.borderRadius),
        hoverColor: isDanger
            ? colorScheme.error.withValues(alpha: 0.12)
            : colorScheme.onSurface.withValues(alpha: 0.08),
        splashColor: isDanger
            ? colorScheme.error.withValues(alpha: 0.16)
            : colorScheme.onSurface.withValues(alpha: 0.12),
        highlightColor: isDanger
            ? colorScheme.error.withValues(alpha: 0.1)
            : colorScheme.onSurface.withValues(alpha: 0.08),
        child: content,
      ),
    );
  }
}

/// Non-interactive header row with the same metrics as [AppMenuItem]
/// (used for the vocal tile name). [onTap] is an optional future hook
/// (e.g. open profile); when null the row has no hover effect.
class AppMenuHeader extends StatelessWidget {
  const AppMenuHeader({super.key, required this.label, this.icon, this.onTap});

  final String label;
  final List<List<dynamic>>? icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    if (onTap == null) {
      final colorScheme = Theme.of(context).colorScheme;
      final theme = Theme.of(context);
      return Container(
        height: AppMenuTokens.itemHeight,
        padding: const EdgeInsets.symmetric(horizontal: AppMenuTokens.padding),
        child: Row(
          children: [
            if (icon != null) ...[
              AppHugeIcon(icon: icon!, size: 20, color: colorScheme.onSurface),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Text(
                label,
                style:
                    theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ) ??
                    TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    }
    return AppMenuItem(label: label, icon: icon, onTap: onTap);
  }
}
