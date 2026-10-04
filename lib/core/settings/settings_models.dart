/// Data model for the settings catalog.
///
/// Hierarchy: `Category -> Page -> Group -> Item`.
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/utils/platform.dart';

extension SettingsL10nX on BuildContext {
  String settingsText(String Function(AppLocalizations) text) =>
      text(AppLocalizations.of(this)!);
}

typedef SettingOptionsLoader =
    Future<List<SettingOption>> Function(WidgetRef ref);

typedef SettingOptionPicked =
    Future<void> Function(WidgetRef ref, String value);

enum SettingScope { local, synchronized }

enum SettingComponent {
  navigation,
  modal,
  externalLink,
  switchToggle,
  select,
  multiSelect,
  slider,
  textInput,
  colorPicker,
  value,
  staticText,
  action,
  custom,
  hotkey,
}

/// A stable selectable value with a localized label ([label]).
class SettingOption {
  final String value;
  final String Function(AppLocalizations) label;
  const SettingOption(this.value, this.label);
}

/// A single row/element inside a group.
///
/// - [settingKey]: persisted preference key (absent for actions,
///   read-only info and navigation elements).
/// - [scope]: required when [settingKey] is present.
/// - [actionId]: handler id resolved by the Flutter action registry.
/// - [externalUrl]: URL opened directly by the external link row
///   (no action needed; only for [SettingComponent.externalLink]).
/// - [customRendererId]: renderer id for complex domain UI.
/// - [optionsLoader]/[onOptionPicked]: optional lazy select behavior. When
///   [optionsLoader] is present the select sheet calls it on open (spinner
///   meanwhile) instead of using static [options]; [onOptionPicked] handles
///   the tap, defaulting to the standard persist by [settingKey]. The
///   catalog references top-level feature functions, so settings never
///   imports feature code.
/// - [valueProviderId]: provider id for read-only values (e.g. app version).
/// - [disabled]: when true the row renders non-interactive (WIP placeholder).
///   Defaults to false.
/// - [supportedOS]: OS list where the item is visible. Defaults to all
///   [AppOS.values]; e.g. tray/startup items use only desktop OS.
class SettingItem {
  final String id;
  final SettingComponent component;
  final String? settingKey;
  final SettingScope? scope;
  final Object? defaultValue;
  final List<SettingOption>? options;
  final double? min;
  final double? max;
  final String? actionId;
  final String? externalUrl;
  final String? customRendererId;
  final SettingOptionsLoader? optionsLoader;
  final SettingOptionPicked? onOptionPicked;
  final String? valueProviderId;
  final String? targetPageId;
  final List<List<dynamic>>? icon;
  final String Function(AppLocalizations) title;
  final String Function(AppLocalizations) subtitle;
  final bool danger;
  final bool disabled;
  final List<AppOS> supportedOS;

  const SettingItem({
    required this.id,
    required this.component,
    required this.title,
    required this.subtitle,
    this.settingKey,
    this.scope,
    this.defaultValue,
    this.options,
    this.min,
    this.max,
    this.actionId,
    this.externalUrl,
    this.customRendererId,
    this.optionsLoader,
    this.onOptionPicked,
    this.valueProviderId,
    this.targetPageId,
    this.icon,
    this.danger = false,
    this.disabled = false,
    this.supportedOS = AppOS.values,
  });

  /// Whether this item should be shown on the current OS.
  bool get isSupportedOnCurrentOS => supportedOS.contains(currentOS);

  /// Whether the row must render as non-interactive.
  bool get isEffectivelyDisabled => disabled || !isSupportedOnCurrentOS;
}

class SettingGroup {
  final String id;
  final String Function(AppLocalizations) title;
  final List<SettingItem> items;
  const SettingGroup({
    required this.id,
    required this.title,
    required this.items,
  });
}

class SettingPage {
  final String id;
  final String Function(AppLocalizations) title;
  final String Function(AppLocalizations) subtitle;
  final List<SettingGroup> groups;
  const SettingPage({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.groups,
  });
}

class SettingCategory {
  final String id;
  final List<List<dynamic>> icon;
  final String Function(AppLocalizations) title;
  final String Function(AppLocalizations) subtitle;
  final List<SettingPage> pages;
  final List<SettingItem> items;

  const SettingCategory({
    required this.id,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.pages = const [],
    this.items = const [],
  });
}
