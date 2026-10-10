import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/settings/settings_base_row.dart';

/// Row that navigates to another settings page
/// (`production` `SettingsRow` with `type: NAVIGATE`).
///
/// The trailing arrow is shown only when [onTap] is provided.
class SettingsNavigationRow extends StatelessWidget {
  const SettingsNavigationRow({
    super.key,
    this.icon,
    this.leading,
    required this.title,
    this.subtitle,
    this.danger = false,
    this.onTap,
    this.trailingIcon = HugeIcons.strokeRoundedArrowRight01,
    this.trailingText,
  });

  final List<List<dynamic>>? icon;
  final Widget? leading;
  final String title;
  final String? subtitle;
  final bool danger;
  final VoidCallback? onTap;
  final List<List<dynamic>> trailingIcon;

  /// Optional text shown before the arrow (e.g. a count badge value).
  /// Displayed whenever non-empty, even when the row is not tappable;
  /// the arrow is still shown only when [onTap] is provided.
  final String? trailingText;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final tap = onTap;
    final text = trailingText;
    final hasText = text != null && text.isNotEmpty;
    if (tap == null && !hasText) {
      return SettingsBaseRow(
        icon: icon,
        leading: leading,
        title: title,
        subtitle: subtitle,
        danger: danger,
      );
    }
    return SettingsBaseRow(
      icon: icon,
      leading: leading,
      title: title,
      subtitle: subtitle,
      danger: danger,
      onTap: tap,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (hasText)
            Text(
              text,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.end,
            ),
          if (tap != null) ...[
            if (hasText) const SizedBox(width: 4),
            AppHugeIcon(
              icon: trailingIcon,
              size: 20,
              color: colorScheme.onSurfaceVariant,
            ),
          ],
        ],
      ),
    );
  }
}
