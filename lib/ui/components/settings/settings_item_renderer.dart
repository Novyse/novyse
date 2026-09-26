import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/settings/settings_actions.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/utils/platform.dart';

import 'package:novyse/pages/app/settings/settings_catalog_page.dart';
import 'package:novyse/ui/components/settings/settings_modal_row.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_sheets.dart';
import 'package:novyse/ui/components/settings/settings_switch_row.dart';
import 'package:novyse/ui/components/settings/settings_value_row.dart';

/// Renders a [SettingItem] with the shared settings row components.
class SettingsItemRenderer extends ConsumerWidget {
  final SettingItem item;

  const SettingsItemRenderer({super.key, required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Hide items not supported on this OS (e.g. tray/startup on mobile/web).
    if (!item.supportedOS.contains(currentOS)) {
      return const SizedBox.shrink();
    }
    final bool isDisabled = item.disabled;
    final title = context.settingsText(item.title);
    final subtitle = context.settingsText(item.subtitle);
    final subtitleOrNull = subtitle.isEmpty ? null : subtitle;
    final settingKey = item.settingKey;

    Widget wrapDisabled(Widget child) {
      if (!isDisabled) return child;
      return Opacity(opacity: 0.5, child: IgnorePointer(child: child));
    }

    switch (item.component) {
      case SettingComponent.switchToggle:
        final raw = settingKey == null
            ? null
            : ref.watch(settingValueProvider(settingKey));
        final value = raw is bool
            ? raw
            : (item.defaultValue is bool ? item.defaultValue as bool : false);
        return wrapDisabled(
          SettingsSwitchRow(
            icon: item.icon,
            title: title,
            subtitle: subtitleOrNull,
            value: value,
            onChanged: (isDisabled || settingKey == null)
                ? null
                : (next) => ref
                    .read(settingsControllerProvider.notifier)
                    .set(settingKey, next),
          ),
        );

      case SettingComponent.select:
      case SettingComponent.multiSelect:
      case SettingComponent.slider:
      case SettingComponent.textInput:
      case SettingComponent.colorPicker:
        final raw = settingKey == null
            ? null
            : ref.watch(settingValueProvider(settingKey));
        return wrapDisabled(
          SettingsValueRow(
            icon: item.icon,
            title: title,
            subtitle: subtitleOrNull,
            valueText: _displayValue(context, raw ?? item.defaultValue),
            onTap: isDisabled ? null : () => _openSheet(context, ref),
          ),
        );

      case SettingComponent.hotkey:
      case SettingComponent.custom:
        final raw = settingKey == null
            ? null
            : ref.watch(settingValueProvider(settingKey));
        return wrapDisabled(
          SettingsValueRow(
            icon: item.icon,
            title: title,
            subtitle: subtitleOrNull,
            valueText: _displayValue(context, raw ?? item.defaultValue),
            onTap: isDisabled
                ? null
                : () => showSettingsComingSoonSheet(
                      context: context,
                      item: item,
                    ),
          ),
        );

      case SettingComponent.value:
        return wrapDisabled(
          SettingsValueRow(
            icon: item.icon,
            title: title,
            subtitle: subtitleOrNull,
            valueText: item.valueProviderId == 'appVersion'
                ? config.appVersion
                : null,
          ),
        );

      case SettingComponent.staticText:
        return wrapDisabled(
          SettingsValueRow(
            icon: item.icon,
            title: title,
            subtitle: subtitleOrNull,
          ),
        );

      case SettingComponent.action:
        const directActions = {
          'openPrivacyPolicy',
          'openTerms',
          'openLicenses',
          'openAppLicense',
        };
        if (directActions.contains(item.actionId)) {
          return wrapDisabled(
            SettingsNavigationRow(
              icon: item.icon,
              title: title,
              subtitle: subtitleOrNull,
              danger: item.danger,
              onTap: isDisabled
                  ? null
                  : () => runSettingsAction(ref, context, item.actionId!),
            ),
          );
        }
        return wrapDisabled(
          SettingsNavigationRow(
            icon: item.icon,
            title: title,
            subtitle: subtitleOrNull,
            danger: item.danger,
            onTap: isDisabled
                ? null
                : () => showSettingsConfirmSheet(
                      context: context,
                      ref: ref,
                      item: item,
                    ),
          ),
        );

      case SettingComponent.navigation:
      case SettingComponent.modal:
        final target = item.targetPageId;
        if (target == null) {
          return wrapDisabled(
            SettingsValueRow(
              icon: item.icon,
              title: title,
              subtitle: subtitleOrNull,
            ),
          );
        }
        final parts = target.split('/');
        final row = SettingsNavigationRow(
          icon: item.icon,
          title: title,
          subtitle: subtitleOrNull,
          danger: item.danger,
          onTap: (isDisabled || parts.length != 2)
              ? null
              : () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => SettingsGroupPage(
                        categoryId: parts[0],
                        pageId: parts[1],
                      ),
                    ),
                  ),
        );
        if (item.component == SettingComponent.modal) {
          return wrapDisabled(
            SettingsModalRow(
              icon: item.icon,
              title: title,
              subtitle: subtitleOrNull,
              onTap: row.onTap,
            ),
          );
        }
        return wrapDisabled(row);
    }
  }

  void _openSheet(BuildContext context, WidgetRef ref) {
    switch (item.component) {
      case SettingComponent.select:
        showSettingsSelectSheet(context: context, ref: ref, item: item);
      case SettingComponent.multiSelect:
        showSettingsMultiSelectSheet(context: context, ref: ref, item: item);
      case SettingComponent.slider:
        showSettingsSliderSheet(context: context, ref: ref, item: item);
      case SettingComponent.textInput:
        showSettingsTextSheet(context: context, ref: ref, item: item);
      case SettingComponent.colorPicker:
        showSettingsColorSheet(context: context, ref: ref, item: item);
      default:
        break;
    }
  }

  String? _displayValue(BuildContext context, Object? value) {
    if (value == null) return null;
    if (item.component == SettingComponent.select &&
        item.options != null &&
        value is String) {
      for (final option in item.options!) {
        if (option.value == value) {
          final label = context.settingsText(option.label);
          return label.isEmpty ? value : label;
        }
      }
      return value;
    }
    if (item.component == SettingComponent.multiSelect && value is String) {
      if (value.isEmpty) return null;
      final parts = value.split(',').where((e) => e.isNotEmpty).toList();
      if (parts.isEmpty) return null;
      return parts.join(', ');
    }
    final text = value.toString();
    if (text.isEmpty || text == '{}' || text == '[]') return null;
    if (text.length > 32) return null;
    return text;
  }
}
