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
  });

  final List<List<dynamic>>? icon;
  final Widget? leading;
  final String title;
  final String? subtitle;
  final bool danger;
  final VoidCallback? onTap;
  final List<List<dynamic>> trailingIcon;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final tap = onTap;
    return SettingsBaseRow(
      icon: icon,
      leading: leading,
      title: title,
      subtitle: subtitle,
      danger: danger,
      onTap: tap,
      trailing: tap == null
          ? null
          : AppHugeIcon(
              icon: trailingIcon,
              size: 20,
              color: colorScheme.onSurfaceVariant,
            ),
    );
  }
}
