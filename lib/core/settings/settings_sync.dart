import 'package:flutter/foundation.dart';

import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/storage/database/database.dart';

class SettingsSync {
  SettingsSync._();

  /// Persists remote synchronized values (server wins) and notifies
  /// per key. Unknown keys and non-synchronized scopes are dropped.
  static Future<void> applyRemoteValues(Map<String, Object?> values) async {
    if (values.isEmpty) return;
    try {
      final filtered = <String, Object?>{};
      for (final entry in values.entries) {
        final item = SettingsCatalog.findBySettingKey(entry.key);
        if (item == null) continue;
        if (item.scope != SettingScope.synchronized) continue;
        filtered[entry.key] = entry.value;
      }
      if (filtered.isEmpty) return;
      final db = AppDatabase.instance;
      if (!db.isOpen) return;
      await db.settings.upsertAll(
        values: filtered,
        scope: 'synchronized',
      );
      for (final entry in filtered.entries) {
        EventBus.instance.emit(
          SettingValueUpdateEvent(key: entry.key, value: entry.value),
        );
      }
    } catch (e) {
      debugPrint('[SettingsSync] applyRemoteValues failed: $e');
    }
  }
}
