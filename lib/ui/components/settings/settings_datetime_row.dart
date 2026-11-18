import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:intl/intl.dart';
import 'package:novyse/ui/components/datetime/datetime_picker.dart';
import 'package:novyse/ui/components/datetime/datetime_picker_overlay.dart';
import 'package:novyse/ui/components/settings/settings_base_row.dart';

class SettingsDatetimeRow extends StatelessWidget {
  const SettingsDatetimeRow({
    super.key,
    this.icon,
    this.leading,
    required this.title,
    this.subtitle,
    required this.mode,
    this.value,
    required this.notSetLabel,
    this.clearTooltip,
    this.onChanged,
    this.onCleared,
    this.yearsBack = 50,
    this.yearsForward = 50,
    this.confirmLabel = 'Confirm',
    this.cancelLabel = 'Cancel',
  });

  final List<List<dynamic>>? icon;
  final Widget? leading;
  final String title;
  final String? subtitle;
  final DatetimePickerMode mode;
  final DateTime? value;
  final String notSetLabel;
  final String? clearTooltip;
  final ValueChanged<DateTime>? onChanged;
  final VoidCallback? onCleared;
  final int yearsBack;
  final int yearsForward;
  final String confirmLabel;
  final String cancelLabel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final current = value;
    final valueText = current == null
        ? notSetLabel
        : formatSettingsDatetime(current, mode);

    return SettingsBaseRow(
      icon: icon,
      leading: leading,
      title: title,
      subtitle: subtitle,
      onTap: onChanged == null
          ? null
          : () => unawaited(_pick(context, current)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            valueText,
            style: TextStyle(
              fontSize: 14,
              color: scheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.end,
          ),
          if (current != null && onCleared != null) ...[
            const SizedBox(width: 4),
            SettingsClearButton(
              tooltip: clearTooltip,
              onPressed: onCleared!,
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _pick(BuildContext context, DateTime? current) async {
    final onChanged = this.onChanged;
    if (onChanged == null) return;
    final picked = await showDatetimePickerOverlay(
      context: context,
      mode: mode,
      initialDateTime: current ?? DateTime.now(),
      yearsBack: yearsBack,
      yearsForward: yearsForward,
      title: title,
      confirmLabel: confirmLabel,
      cancelLabel: cancelLabel,
    );
    if (picked == null) return;
    onChanged(picked);
  }
}

String formatSettingsDatetime(DateTime value, DatetimePickerMode mode) {
  return switch (mode) {
    DatetimePickerMode.date => DateFormat('dd/MM/yyyy').format(value),
    DatetimePickerMode.time => DateFormat('HH:mm').format(value),
    DatetimePickerMode.dateTime =>
      DateFormat('dd/MM/yyyy · HH:mm').format(value),
  };
}
