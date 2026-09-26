import 'package:flutter/widgets.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/utils/platform.dart';

/// Searches the settings catalog for items whose localized title or
/// subtitle contains [query] (case-insensitive).
///
/// Returns the matching items grouped by their category, preserving catalog
/// order both across categories and within each category (page groups first,
/// then loose category items). Categories without matches are omitted.
///
/// Items unsupported on the current OS are excluded (like the category
/// pages do); `disabled` (WIP) items are kept so the search indexes the
/// whole catalog — [SettingsItemRenderer] already renders them dimmed.
Map<SettingCategory, List<SettingItem>> searchSettings({
  required BuildContext context,
  required String query,
}) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return {};

  bool matches(SettingItem item) {
    final title = context.settingsText(item.title).toLowerCase();
    final subtitle = context.settingsText(item.subtitle).toLowerCase();
    return title.contains(q) || subtitle.contains(q);
  }

  final hits = <SettingCategory, List<SettingItem>>{};
  for (final category in SettingsCatalog.categories) {
    final matched = <SettingItem>[];
    for (final page in category.pages) {
      for (final group in page.groups) {
        for (final item in group.items) {
          if (!item.supportedOS.contains(currentOS)) continue;
          if (matches(item)) matched.add(item);
        }
      }
    }
    for (final item in category.items) {
      if (!item.supportedOS.contains(currentOS)) continue;
      if (matches(item)) matched.add(item);
    }
    if (matched.isNotEmpty) hits[category] = matched;
  }
  return hits;
}
