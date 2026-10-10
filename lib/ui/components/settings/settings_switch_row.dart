import 'package:flutter/material.dart';
import 'package:novyse/ui/components/settings/settings_base_row.dart';

/// On/off setting row (`production` `SettingsRow` with `type: SWITCH`).
///
/// Tapping the whole row toggles the value. When [onChanged] is null the
/// switch renders disabled and the row is not tappable.
class SettingsSwitchRow extends StatelessWidget {
  const SettingsSwitchRow({
    super.key,
    this.icon,
    this.leading,
    required this.title,
    this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final List<List<dynamic>>? icon;
  final Widget? leading;
  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    final toggle = onChanged;
    return SettingsBaseRow(
      icon: icon,
      leading: leading,
      title: title,
      subtitle: subtitle,
      onTap: toggle == null ? null : () => toggle(!value),
      trailing: Switch(value: value, onChanged: toggle),
    );
  }
}
