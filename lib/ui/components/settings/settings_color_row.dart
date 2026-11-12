import 'dart:async';

import 'package:flutter/material.dart';
import 'package:novyse/ui/components/color_picker/color_picker.dart';
import 'package:novyse/ui/components/color_picker/color_picker_sheet.dart';
import 'package:novyse/ui/components/settings/settings_base_row.dart';

typedef SettingsColorChanged =
    void Function(LinearGradient gradient, double angle);

class SettingsColorRow extends StatelessWidget {
  const SettingsColorRow({
    super.key,
    this.icon,
    this.leading,
    required this.title,
    this.subtitle,
    this.value,
    this.angle = 90.0,
    required this.notSetLabel,
    this.clearTooltip,
    this.onChanged,
    this.onCleared,
    this.allowModeSwitch = true,
    this.showGradientAngle = true,
    this.gradientPreviewText,
  });

  final List<List<dynamic>>? icon;
  final Widget? leading;
  final String title;
  final String? subtitle;

  final LinearGradient? value;
  final double angle;
  final String notSetLabel;
  final String? clearTooltip;
  final SettingsColorChanged? onChanged;
  final VoidCallback? onCleared;
  final bool allowModeSwitch;
  final bool showGradientAngle;
  final String? gradientPreviewText;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final gradient = value;

    return SettingsBaseRow(
      icon: icon,
      leading: leading,
      title: title,
      subtitle: subtitle,
      onTap: onChanged == null ? null : () => unawaited(_pick(context)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (gradient == null)
            Text(
              notSetLabel,
              style: TextStyle(
                fontSize: 14,
                color: scheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.end,
            )
          else
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: scheme.outlineVariant),
                gradient: gradient,
              ),
            ),
          if (gradient != null && onCleared != null) ...[
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

  Future<void> _pick(BuildContext context) async {
    final changed = onChanged;
    if (changed == null) return;

    final current = value;
    final stopCount = current?.colors.length ?? 0;
    final isSolid = stopCount <= 1;
    final initialColor = stopCount >= 1
        ? current!.colors.first
        : const Color(0xFF0F6FFF);

    var currentAngle = angle;
    LinearGradient? lastGradient = current;

    await showColorPickerSheet(
      context: context,
      mode: isSolid
          ? ColorPickerMode.color
          : ColorPickerMode.gradient,
      allowModeSwitch: allowModeSwitch,
      gradientColors: stopCount >= 2 ? stopCount : 2,
      initialColor: initialColor,
      initialGradientColors: stopCount >= 2 ? current!.colors : null,
      initialGradientPositions: stopCount >= 2 ? current!.stops : null,
      initialAngle: currentAngle,
      showGradientAngle: showGradientAngle,
      gradientPreviewText: gradientPreviewText,
      onColorChanged: (color) {
        final solid = LinearGradient(
          colors: [color, color],
          stops: const [0.0, 1.0],
        );
        lastGradient = solid;
        changed(solid, currentAngle);
      },
      onGradientChanged: (picked) {
        lastGradient = picked;
        changed(picked, currentAngle);
      },
      onAngleChanged: (pickedAngle) {
        currentAngle = pickedAngle;
        final last = lastGradient;
        if (last != null) changed(last, currentAngle);
      },
    );
  }
}
