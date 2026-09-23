import 'package:flutter/material.dart';
import 'package:novyse/ui/components/settings/settings_base_row.dart';

/// Single-choice row with a radio indicator
/// (`production` `SettingsRow` with `type: SELECT_GROUP`).
///
/// Map each option of the group to one of these rows; the group state itself
/// stays in the calling page (see `production` `SettingsSelectGroup.tsx`).
class SettingsSelectRow extends StatelessWidget {
  const SettingsSelectRow({
    super.key,
    this.icon,
    this.leading,
    required this.title,
    this.subtitle,
    this.valueText,
    required this.selected,
    required this.onTap,
  });

  final List<List<dynamic>>? icon;
  final Widget? leading;
  final String title;
  final String? subtitle;
  final String? valueText;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final text = valueText;
    return SettingsBaseRow(
      icon: icon,
      leading: leading,
      title: title,
      subtitle: subtitle ?? text,
      onTap: onTap,
      trailing: Container(
        width: 22,
        height: 22,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: selected
                ? colorScheme.primary
                : colorScheme.onSurfaceVariant,
            width: 2,
          ),
        ),
        alignment: Alignment.center,
        child: selected
            ? Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: colorScheme.primary,
                ),
              )
            : null,
      ),
    );
  }
}
