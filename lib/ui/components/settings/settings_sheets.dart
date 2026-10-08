import 'package:flutter/material.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_actions.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/settings/settings_external_link_row.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';
import 'package:novyse/ui/components/settings/settings_select_row.dart';


Future<T?> _showSettingsSheet<T>({
  required BuildContext context,
  required String title,
  required Widget child,
  String? subtitle,
}) {
  return ResponsiveOverlay.show<T>(
    context: context,
    title: title,
    subtitle: subtitle,
    mode: ResponsiveOverlayMode.dynamic,
    child: child,
  );
}

Future<void> showSettingsSelectSheet({
  required BuildContext context,
  required WidgetRef ref,
  required SettingItem item,
}) {
  final title = context.settingsText(item.title);
  if (item.optionsLoader != null) {
    return _showSettingsSheet(
      context: context,
      title: title,
      subtitle: context.l10n.settingsCommonSelectOption,
      child: _LazySelectBody(item: item),
    );
  }
  final settingKey = item.settingKey;
  final options = item.options ?? const [];
  return _showSettingsSheet(
    context: context,
    title: title,
    subtitle: context.l10n.settingsCommonSelectOption,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        SettingsSection(
          children: [
            for (final option in options)
              _SelectOptionRow(
                item: item,
                option: option,
                onPick: () async {
                  final onPicked = item.onOptionPicked;
                  if (onPicked != null) {
                    await onPicked(ref, option.value);
                  } else if (settingKey != null) {
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

class _SelectOptionRow extends ConsumerWidget {  final SettingItem item;
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
      disabled: option.disabled,
      onTap: () => onPick(),
    );
  }
}

/// Lazy select body: loads options only when the sheet opens.
/// Same visuals as the static select sheet.
class _LazySelectBody extends ConsumerStatefulWidget {
  final SettingItem item;

  const _LazySelectBody({required this.item});

  @override
  ConsumerState<_LazySelectBody> createState() => _LazySelectBodyState();
}

class _LazySelectBodyState extends ConsumerState<_LazySelectBody> {
  late final Future<List<SettingOption>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.item.optionsLoader!(ref);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<SettingOption>>(
      future: _future,
      builder: (context, snapshot) {
        final options = snapshot.data ?? const <SettingOption>[];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (snapshot.connectionState == ConnectionState.waiting)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              SettingsSection(
                children: [
                  for (final option in options)
                    _LazyOptionRow(item: widget.item, option: option),
                ],
              ),
          ],
        );
      },
    );
  }
}

class _LazyOptionRow extends ConsumerWidget {
  final SettingItem item;
  final SettingOption option;

  const _LazyOptionRow({required this.item, required this.option});

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
      disabled: option.disabled,
      onTap: () async {
        final onPicked = item.onOptionPicked;
        if (onPicked != null) {
          await onPicked(ref, option.value);
        } else if (settingKey != null) {
          await ref
              .read(settingsControllerProvider.notifier)
              .set(settingKey, option.value);
        }
        if (context.mounted) {
          Navigator.of(context, rootNavigator: true).pop();
        }
      },
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
    title: title,
    child: StatefulBuilder(
      builder: (sheetContext, setSheetState) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
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
          AppButton(
            label: context.l10n.settingsCommonDone,
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
    title: title,
    child: StatefulBuilder(
      builder: (sheetContext, setSheetState) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          // The live value lives in the body, not in the header: the header
          // title is fixed for the whole lifetime of the overlay.
          Center(
            child: Text(
              current.toStringAsFixed(current % 1 == 0 ? 0 : 1),
              style: Theme.of(
                sheetContext,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 8),
          Slider(
            value: current,
            min: min,
            max: max,
            onChanged: (next) => setSheetState(() => current = next),
            onChangeEnd: (next) {
              if (settingKey != null) {
                ref
                    .read(settingsControllerProvider.notifier)
                    .set(settingKey, next % 1 == 0 ? next.toInt() : next);
              }
            },
          ),
          const SizedBox(height: 8),
          AppButton(
            label: sheetContext.l10n.settingsCommonDone,
            onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
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

  return _showSettingsSheet(
    context: context,
    title: title,
    child: _SettingsTextFieldBody(
      hintText: title,
      initialText: raw?.toString() ?? '',
      onSave: (text) async {
        if (settingKey != null) {
          await ref
              .read(settingsControllerProvider.notifier)
              .set(settingKey, text);
        }
        if (context.mounted) {
          Navigator.of(context, rootNavigator: true).pop();
        }
      },
    ),
  );
}

class _SettingsTextFieldBody extends StatefulWidget {
  const _SettingsTextFieldBody({
    required this.hintText,
    required this.initialText,
    required this.onSave,
  });

  final String hintText;
  final String initialText;
  final Future<void> Function(String text) onSave;

  @override
  State<_SettingsTextFieldBody> createState() => _SettingsTextFieldBodyState();
}

class _SettingsTextFieldBodyState extends State<_SettingsTextFieldBody> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.initialText,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller: _controller,
          autofocus: true,
          decoration: InputDecoration(
            hintText: widget.hintText,
            border: const OutlineInputBorder(),
          ),
          onSubmitted: (_) => widget.onSave(_controller.text),
        ),
        const SizedBox(height: 16),
        AppButton(
          label: context.l10n.settingsCommonSave,
          onPressed: () => widget.onSave(_controller.text),
        ),
      ],
    );
  }
}

Future<void> showSettingsColorSheet({
  required BuildContext context,
  required WidgetRef ref,
  required SettingItem item,
}) {
  return _showSettingsSheet(
    context: context,
    title: context.settingsText(item.title),
    child: _SettingsColorPickerSheet(item: item, ref: ref),
  );
}

class _SettingsColorPickerSheet extends StatefulWidget {
  final SettingItem item;
  final WidgetRef ref;

  const _SettingsColorPickerSheet({required this.item, required this.ref});

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
    final raw = key == null ? null : widget.ref.read(settingValueProvider(key));
    final initialHex =
        (raw ?? widget.item.defaultValue)?.toString() ?? '#0F6FFF';
    _selectedColor = colorFromHex(initialHex) ?? const Color(0xFF0F6FFF);
  }

  @override
  Widget build(BuildContext context) {
    final hexString = colorToHex(
      _selectedColor,
      includeHashSign: true,
      enableAlpha: false,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest
                  .withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Theme.of(context).colorScheme.outlineVariant
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
                              : Theme.of(context).colorScheme.outline
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
        AppButton(
          label: context.l10n.settingsCommonSave,
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
    title: context.l10n.settingsCommonComingSoonTitle,
    subtitle: '$title · ${context.l10n.settingsCommonComingSoonMessage}',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        AppButton(
          label: context.l10n.settingsCommonDone,
          onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
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
    title: title,
    subtitle: subtitle.isEmpty ? null : subtitle,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Expanded(
              child: AppButton(
                label: context.l10n.settingsCommonCancel,
                onPressed: () =>
                    Navigator.of(context, rootNavigator: true).pop(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AppButton(
                label: context.l10n.settingsCommonConfirm,
                variant: item.danger
                    ? AppButtonVariant.danger
                    : AppButtonVariant.primary,
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
              ),
            ),
          ],
        ),
      ],
    ),
  );

  return confirmed;
}

/// On backend failure the sheet stays open with an
/// error; on success [runSettingsAction] navigates to `/welcome` on its own.
Future<void> showDeleteProfileSheet({
  required BuildContext context,
  required WidgetRef ref,
}) {
  return _showSettingsSheet(
    context: context,
    title: context.l10n.deleteProfileConfirmTitle,
    subtitle: context.l10n.deleteProfileConfirmWarning,
    child: _DeleteProfileBody(ref: ref),
  );
}

/// Guide linked from the delete-profile sheet.
const _deleteAccountGuideUrl =
    'https://www.novyse.com/help/guides/account/delete';

class _DeleteProfileBody extends ConsumerStatefulWidget {
  const _DeleteProfileBody({required this.ref});

  final WidgetRef ref;

  @override
  ConsumerState<_DeleteProfileBody> createState() => _DeleteProfileBodyState();
}

class _DeleteProfileBodyState extends ConsumerState<_DeleteProfileBody> {
  late final TextEditingController _controller = TextEditingController();
  bool _busy = false;
  bool _failed = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    setState(() {
      _busy = true;
      _failed = false;
    });
    final handled = await runSettingsAction(
      widget.ref,
      context,
      'deleteProfile',
    );
    if (!context.mounted) return;
    if (!handled) {
      setState(() {
        _busy = false;
        _failed = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final username = ref.watch(localUserProvider)?.handle ?? '';
    final matches = username.isNotEmpty && _controller.text == username;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          l10n.deleteProfileConfirmInstruction(username),
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _controller,
          autofocus: true,
          autocorrect: false,
          textCapitalization: TextCapitalization.none,
          decoration: InputDecoration(
            hintText: username,
            border: const OutlineInputBorder(),
          ),
          onChanged: (_) => setState(() {
            _failed = false;
          }),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton(
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            onPressed: () => openExternalUrl(_deleteAccountGuideUrl),
            child: Text(l10n.deleteProfileLearnMore),
          ),
        ),
        if (_failed) ...[
          const SizedBox(height: 8),
          Text(
            l10n.deleteProfileError,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.error,
            ),
          ),
        ],
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: AppButton(
                label: l10n.settingsCommonCancel,
                onPressed: _busy
                    ? null
                    : () => Navigator.of(context, rootNavigator: true).pop(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AppButton(
                label: l10n.delete,
                variant: AppButtonVariant.danger,
                isLoading: _busy,
                onPressed: matches && !_busy ? _confirm : null,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
