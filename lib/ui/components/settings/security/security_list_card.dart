import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Card for a single active session/device
class SecurityListCard extends StatelessWidget {
  const SecurityListCard({
    super.key,
    required this.title,
    this.icon = HugeIcons.strokeRoundedComputer,
    this.subtitle,
    this.details,
    this.isCurrent = false,
    this.currentLabel,
    this.revokeTooltip,
    this.onToggle,
    this.active = true,
    this.isRevoking = false,
    this.onRevoke,
  });

  final String title;
  final List<List<dynamic>> icon;
  final String? subtitle;
  final Widget? details;
  final bool isCurrent;
  final String? currentLabel;
  final String? revokeTooltip;
  final ValueChanged<bool>? onToggle;
  final bool active;
  final bool isRevoking;
  final VoidCallback? onRevoke;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final revoke = onRevoke;
    final toggle = onToggle;

    return Card(
      margin: EdgeInsets.zero,
      color: colors.surfaceContainerHighest,
      surfaceTintColor: Colors.transparent,
      shadowColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isCurrent ? colors.primary : colors.outlineVariant,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: (active ? colors.primary : colors.onSurfaceVariant)
                        .withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: AppHugeIcon(
                    icon: icon,
                    size: 22,
                    color: active ? colors.primary : colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      if (subtitle != null && subtitle!.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          subtitle!,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colors.onSurfaceVariant),
                        ),
                      ],
                    ],
                  ),
                ),
                if (isCurrent)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: colors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      currentLabel ?? '',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: colors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                if (isRevoking) ...[
                  const SizedBox(width: 8),
                  const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ] else if (revoke != null) ...[
                  const SizedBox(width: 8),
                  IconButton(
                    tooltip: revokeTooltip,
                    onPressed: revoke,
                    color: AppColors.danger,
                    icon: const AppHugeIcon(
                      icon: HugeIcons.strokeRoundedDelete02,
                      color: AppColors.danger,
                    ),
                  ),
                ],
                if (toggle != null) ...[
                  const SizedBox(width: 4),
                  Switch.adaptive(
                    value: active,
                    onChanged: isRevoking ? null : toggle,
                  ),
                ],
              ],
            ),
            if (details != null) ...[const SizedBox(height: 12), details!],
          ],
        ),
      ),
    );
  }
}
