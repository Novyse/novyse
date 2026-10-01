/// The catalog is the single source of truth for settings navigation,
/// standard row rendering, defaults and validation metadata.
///
/// Hierarchy: `Category -> Page -> Group -> Item`.
library;

import 'package:novyse/core/settings/settings_models.dart';

import 'catalog/account_category.dart';
import 'catalog/chat_settings_category.dart';
import 'catalog/comms_category.dart';
import 'catalog/customization_category.dart';
import 'catalog/info_category.dart';
import 'catalog/languages_time_category.dart';
import 'catalog/notifications_category.dart';
import 'catalog/security_privacy_category.dart';
import 'catalog/storage_category.dart';
import 'catalog/system_category.dart';

export 'settings_models.dart';

class SettingsCatalog {
  SettingsCatalog._();

  static final List<SettingCategory> categories = [
    ...accountCategory,
    ...chatSettingsCategory,
    ...customizationCategory,
    ...storageCategory,
    ...securityPrivacyCategory,
    ...notificationsCategory,
    ...commsCategory,
    ...systemCategory,
    ...languagesTimeFlatEntriesCategory,
    ...infoDiagnosticsFlatEntriesCategory,
  ];

  /// All leaf items across the catalog (page groups + loose category items).
  static List<SettingItem> get allItems => [
    for (final c in categories) ...[
      for (final p in c.pages)
        for (final g in p.groups)
          for (final i in g.items) i,
      for (final i in c.items) i,
    ],
  ];

  /// Persisted preference keys with synchronized scope.
  static List<String> get synchronizedKeys => [
    for (final i in allItems)
      if (i.settingKey != null && i.scope == SettingScope.synchronized)
        i.settingKey!,
  ];

  /// Default values for persisted preferences.
  static Map<String, Object?> get defaults => {
    for (final i in allItems)
      if (i.settingKey != null) i.settingKey!: i.defaultValue,
  };

  static SettingCategory? findCategory(String id) {
    for (final c in categories) {
      if (c.id == id) return c;
    }
    return null;
  }

  static SettingPage? findPage(String categoryId, String pageId) {
    final category = findCategory(categoryId);
    if (category == null) return null;
    for (final p in category.pages) {
      if (p.id == pageId) return p;
    }
    return null;
  }

  static SettingItem? findBySettingKey(String settingKey) {
    for (final i in allItems) {
      if (i.settingKey == settingKey) return i;
    }
    return null;
  }
}
