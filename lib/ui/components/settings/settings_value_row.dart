import 'package:flutter/material.dart';
import 'package:novyse/ui/components/settings/settings_base_row.dart';

/// Read-only value row (`production` `SettingsRow` with `type: VALUE`).
///
/// Prints [valueText] on the right instead of an arrow or a switch.
/// Optionally tappable via [onTap] (no chevron is shown).
class SettingsValueRow extends StatelessWidget {
  const SettingsValueRow({
    super.key,
    this.icon,
    this.leading,
    required this.title,
    this.subtitle,
    this.valueText,
    this.onTap,
  });

  final List<List<dynamic>>? icon;
  final Widget? leading;
  final String title;
  final String? subtitle;
  final String? valueText;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final text = valueText;
    return SettingsBaseRow(
      icon: icon,
      leading: leading,
      title: title,
      subtitle: subtitle,
      onTap: onTap,
      trailing: (text == null || text.isEmpty)
          ? null
          : Text(
              text,
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.end,
            ),
    );
  }
}
