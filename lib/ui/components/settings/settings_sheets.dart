import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_colorpicker/flutter_colorpicker.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_actions.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/settings/settings_controller.dart';

import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';
import 'package:novyse/ui/components/settings/settings_select_row.dart';

/// Bottom sheets backing catalog-driven settings interaction.
///
/// Every sheet is opened from [SettingsItemRenderer]; select/multi/slider/
/// text/color sheets persist through [SettingsController], action sheets
/// ask for confirmation and dispatch to [runSettingsAction].
Future<T?> _showSettingsSheet<T>({
  required BuildContext context,
  required Widget child,
}) {
  return ResponsiveOverlay.show<T>(
    context: context,
    mode: ResponsiveOverlayMode.dynamic,
    child: SingleChildScrollView(
      child: child,
    ),
  );
}

Widget _sheetTitle(BuildContext context, String title, [String? subtitle]) {
  final theme = Theme.of(context);
  return Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        if (subtitle != null && subtitle.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ],
    ),
  );
}

/// Single-choice option picker. Persists the stable option value.
Future<void> showSettingsSelectSheet({
  required BuildContext context,
  required WidgetRef ref,
  required SettingItem item,
}) {
  final title = context.settingsText(item.title);
  final settingKey = item.settingKey;
  final options = item.options ?? const [];
  return _showSettingsSheet(
    context: context,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        _sheetTitle(context, title, context.l10n.settingsCommonSelectOption),
        SettingsSection(
          children: [
            for (final option in options)
              _SelectOptionRow(
                item: item,
                option: option,
                onPick: () async {
                  if (settingKey != null) {
                    await ref
                        .read(settingsControllerProvider.notifier)
                        .set(settingKey, option.value);
                  }
                  if (context.mounted) {
                    Navigator.of(context, rootNavigator: true).pop();
                  }
                },
              ),
          ],
        ),
      ],
    ),
  );
}

class _SelectOptionRow extends ConsumerWidget {
  final SettingItem item;
  final SettingOption option;
  final Future<void> Function() onPick;

  const _SelectOptionRow({
    required this.item,
    required this.option,
    required this.onPick,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingKey = item.settingKey;
    final current = settingKey == null
        ? item.defaultValue
        : (ref.watch(settingValueProvider(settingKey)) ?? item.defaultValue);
    final label = context.settingsText(option.label);
    return SettingsSelectRow(
      title: label.isEmpty ? option.value : label,
      selected: current == option.value,
      onTap: () => onPick(),
    );
  }
}

/// Multi-choice picker. Persists a comma-joined value string.
Future<void> showSettingsMultiSelectSheet({
  required BuildContext context,
  required WidgetRef ref,
  required SettingItem item,
}) {
  final title = context.settingsText(item.title);
  final settingKey = item.settingKey;
  final options = item.options ?? const [];
  final raw = settingKey == null
      ? item.defaultValue
      : ref.read(settingsControllerProvider)[settingKey];
  final initial = raw is String && raw.isNotEmpty
      ? raw.split(',').where((e) => e.isNotEmpty).toSet()
      : <String>{};
  var selected = Set<String>.from(initial);

  return _showSettingsSheet(
    context: context,
    child: StatefulBuilder(
      builder: (sheetContext, setSheetState) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          _sheetTitle(sheetContext, title),
          SettingsSection(
            children: [
              for (final option in options)
                _MultiOptionRow(
                  item: item,
                  option: option,
                  checked: selected.contains(option.value),
                  onChanged: (checked) => setSheetState(() {
                    if (checked) {
                      selected.add(option.value);
                    } else {
                      selected.remove(option.value);
                    }
                  }),
                ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () async {
              if (settingKey != null) {
                await ref
                    .read(settingsControllerProvider.notifier)
                    .set(settingKey, selected.join(','));
              }
              if (context.mounted) {
                Navigator.of(context, rootNavigator: true).pop();
              }
            },
            child: Text(context.l10n.settingsCommonDone),
          ),
        ],
      ),
    ),
  );
}

class _MultiOptionRow extends StatelessWidget {
  final SettingItem item;
  final SettingOption option;
  final bool checked;
  final ValueChanged<bool> onChanged;

  const _MultiOptionRow({
    required this.item,
    required this.option,
    required this.checked,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final label = context.settingsText(option.label);
    return CheckboxListTile(
      value: checked,
      onChanged: (next) => onChanged(next ?? false),
      title: Text(label.isEmpty ? option.value : label),
      controlAffinity: ListTileControlAffinity.trailing,
      contentPadding: const EdgeInsets.symmetric(horizontal: 15),
    );
  }
}

/// Slider editor. Persists the numeric value on release.
Future<void> showSettingsSliderSheet({
  required BuildContext context,
  required WidgetRef ref,
  required SettingItem item,
}) {
  final title = context.settingsText(item.title);
  final settingKey = item.settingKey;
  final min = item.min ?? 0;
  final max = item.max ?? 100;
  final raw = settingKey == null
      ? item.defaultValue
      : ref.read(settingsControllerProvider)[settingKey];
  var current = switch (raw) {
    num v => v.toDouble().clamp(min, max),
    _ => (min + max) / 2,
  };

  return _showSettingsSheet(
    context: context,
    child: StatefulBuilder(
      builder: (sheetContext, setSheetState) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          _sheetTitle(
            sheetContext,
            '$title · ${current.toStringAsFixed(current % 1 == 0 ? 0 : 1)}',
          ),
          Slider(
            value: current,
            min: min,
            max: max,
            onChanged: (next) => setSheetState(() => current = next),
            onChangeEnd: (next) {
              if (settingKey != null) {
                ref.read(settingsControllerProvider.notifier).set(
                      settingKey,
                      next % 1 == 0 ? next.toInt() : next,
                    );
              }
            },
          ),
          const SizedBox(height: 8),
          FilledButton.tonal(
            onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
            child: Text(sheetContext.l10n.settingsCommonDone),
          ),
        ],
      ),
    ),
  );
}

/// Free-text editor with save button.
Future<void> showSettingsTextSheet({
  required BuildContext context,
  required WidgetRef ref,
  required SettingItem item,
}) {
  final title = context.settingsText(item.title);
  final settingKey = item.settingKey;
  final raw = settingKey == null
      ? item.defaultValue
      : ref.read(settingsControllerProvider)[settingKey];
  final controller = TextEditingController(text: raw?.toString() ?? '');

  return _showSettingsSheet(
    context: context,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        _sheetTitle(context, title),
        TextField(
          controller: controller,
          autofocus: true,
          decoration: InputDecoration(
            hintText: title,
            border: const OutlineInputBorder(),
          ),
          onSubmitted: (_) async {
            if (settingKey != null) {
              await ref
                  .read(settingsControllerProvider.notifier)
                  .set(settingKey, controller.text);
            }
            if (context.mounted) {
              Navigator.of(context, rootNavigator: true).pop();
            }
          },
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () async {
            if (settingKey != null) {
              await ref
                  .read(settingsControllerProvider.notifier)
                  .set(settingKey, controller.text);
            }
            if (context.mounted) {
              Navigator.of(context, rootNavigator: true).pop();
            }
          },
          child: Text(context.l10n.settingsCommonSave),
        ),
      ],
    ),
  );
}

Future<void> showSettingsColorSheet({
  required BuildContext context,
  required WidgetRef ref,
  required SettingItem item,
}) {
  return _showSettingsSheet(
    context: context,
    child: _SettingsColorPickerSheet(
      item: item,
      ref: ref,
    ),
  );
}

class _SettingsColorPickerSheet extends StatefulWidget {
  final SettingItem item;
  final WidgetRef ref;

  const _SettingsColorPickerSheet({
    required this.item,
    required this.ref,
  });

  @override
  State<_SettingsColorPickerSheet> createState() =>
      _SettingsColorPickerSheetState();
}

class _SettingsColorPickerSheetState extends State<_SettingsColorPickerSheet> {
  late Color _selectedColor;

  static const _quickPresets = [
    '#0F6FFF',
    '#69D2FF',
    '#1DBF73',
    '#FFC857',
    '#E45757',
    '#B388FF',
    '#FF8AC2',
    '#FFFFFF',
  ];

  @override
  void initState() {
    super.initState();
    final key = widget.item.settingKey;
    final raw =
        key == null ? null : widget.ref.read(settingValueProvider(key));
    final initialHex =
        (raw ?? widget.item.defaultValue)?.toString() ?? '#0F6FFF';
    _selectedColor = colorFromHex(initialHex) ?? const Color(0xFF0F6FFF);
  }

  @override
  Widget build(BuildContext context) {
    final title = context.settingsText(widget.item.title);
    final hexString = colorToHex(
      _selectedColor,
      includeHashSign: true,
      enableAlpha: false,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        _sheetTitle(context, title),
        const SizedBox(height: 8),
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest
                  .withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Theme.of(context)
                    .colorScheme
                    .outlineVariant
                    .withValues(alpha: 0.5),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: _selectedColor,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outline,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  hexString,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Center(
          child: HueRingPicker(
            pickerColor: _selectedColor,
            onColorChanged: (color) => setState(() => _selectedColor = color),
            enableAlpha: false,
            displayThumbColor: true,
            portraitOnly: true,
            colorPickerHeight: 220.0,
            hueRingStrokeWidth: 20.0,
          ),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (final hex in _quickPresets)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: InkWell(
                    onTap: () {
                      final c = colorFromHex(hex);
                      if (c != null) setState(() => _selectedColor = c);
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: colorFromHex(hex),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: hexString == hex
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context)
                                  .colorScheme
                                  .outline
                                  .withValues(alpha: 0.4),
                          width: hexString == hex ? 2.5 : 1.0,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: () async {
            final settingKey = widget.item.settingKey;
            if (settingKey != null) {
              await widget.ref
                  .read(settingsControllerProvider.notifier)
                  .set(settingKey, hexString);
            }
            if (context.mounted) {
              Navigator.of(context, rootNavigator: true).pop();
            }
          },
          child: Text(context.l10n.settingsCommonSave),
        ),
      ],
    );
  }
}

/// Placeholder sheet for editors not implemented yet (custom renderers,
/// hotkey recorder). Acknowledges the tap instead of doing nothing.
Future<void> showSettingsComingSoonSheet({
  required BuildContext context,
  required SettingItem item,
}) {
  final title = context.settingsText(item.title);
  return _showSettingsSheet(
    context: context,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        _sheetTitle(
          context,
          context.l10n.settingsCommonComingSoonTitle,
          '$title · ${context.l10n.settingsCommonComingSoonMessage}',
        ),
        FilledButton.tonal(
          onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
          child: Text(context.l10n.settingsCommonDone),
        ),
      ],
    ),
  );
}

/// Confirmation sheet for catalog actions. Returns true when confirmed
/// and the action was handled (e.g. logout navigates away by itself).
Future<bool> showSettingsConfirmSheet({
  required BuildContext context,
  required WidgetRef ref,
  required SettingItem item,
}) async {
  final title = context.settingsText(item.title);
  final subtitle = context.settingsText(item.subtitle);
  final actionId = item.actionId;
  var confirmed = false;

  await _showSettingsSheet(
    context: context,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        _sheetTitle(context, title, subtitle.isEmpty ? null : subtitle),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () =>
                    Navigator.of(context, rootNavigator: true).pop(),
                child: Text(context.l10n.settingsCommonCancel),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                style: item.danger
                    ? FilledButton.styleFrom(
                        backgroundColor:
                            Theme.of(context).colorScheme.error,
                        foregroundColor:
                            Theme.of(context).colorScheme.onError,
                      )
                    : null,
                onPressed: () async {
                  var handled = false;
                  if (actionId != null) {
                    handled = await runSettingsAction(ref, context, actionId);
                  }
                  confirmed = true;
                  if (context.mounted && !handled) {
                    Navigator.of(context, rootNavigator: true).pop();
                  }
                },
                child: Text(context.l10n.settingsCommonConfirm),
              ),
            ),
          ],
        ),
      ],
    ),
  );

  return confirmed;
}
