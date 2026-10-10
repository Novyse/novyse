import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/settings/settings_base_row.dart';

/// Row that opens a modal/bottom sheet instead of navigating
/// (`production` `SettingsRow` with `type: MODAL`).
class SettingsModalRow extends StatelessWidget {
  const SettingsModalRow({
    super.key,
    this.icon,
    this.leading,
    required this.title,
    this.subtitle,
    this.onTap,
    this.trailingIcon = HugeIcons.strokeRoundedArrowUpRight01,
  });

  final List<List<dynamic>>? icon;
  final Widget? leading;
  final String title;
  final String? subtitle;
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
