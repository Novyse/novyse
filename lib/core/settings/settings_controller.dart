import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/storage/database/database.dart';

/// In-memory mirror of settings values for the UI.
class SettingsController extends Notifier<Map<String, Object?>> {
  Future<void>? _initFuture;
  bool _disposed = false;

  @override
  Map<String, Object?> build() {
    ref.onDispose(() => _disposed = true);

    final bus = ref.read(eventBusProvider);
    final sub = bus.on<SettingValueUpdateEvent>().listen((event) {
      final item = SettingsCatalog.findBySettingKey(event.key);
      if (item == null) return;
      if (item.scope != SettingScope.synchronized) return;
      state = {...state, event.key: event.value};
    });
    ref.onDispose(sub.cancel);
    Future.microtask(() => init());
    return Map<String, Object?>.from(SettingsCatalog.defaults);
  }

  AppDatabase get _db => ref.read(databaseProvider);

  Future<void> init() => _initFuture ??= _load();

  Future<void> _load() async {
    try {
      final stored = await _db.settings.getAllSettings();
      if (_disposed) return;
      state = {...SettingsCatalog.defaults, ...stored};
    } catch (e) {
      debugPrint('[SettingsController] init failed: $e');
      if (_disposed) return;
      state = Map<String, Object?>.from(SettingsCatalog.defaults);
    }
  }

  Object? get(String settingKey) => state[settingKey];

  Future<bool> set(String settingKey, Object? value) async {
    final item = SettingsCatalog.findBySettingKey(settingKey);
    if (item == null) return false;
    if (item.settingKey == null || item.scope == null) return false;

    final scopeName = item.scope == SettingScope.synchronized
        ? 'synchronized'
        : 'local';
    final ok = await _db.settings.upsertSetting(
      key: settingKey,
      value: value,
      scope: scopeName,
    );
    if (!ok) return false;

    state = {...state, settingKey: value};

    if (item.scope == SettingScope.synchronized) {
      try {
        await apiGateway.user.settings.updateSetting(settingKey, value);
      } catch (e) {
        debugPrint('[SettingsController] push failed for $settingKey: $e');
      }
    }
    return true;
  }
}

final settingsControllerProvider =
    NotifierProvider<SettingsController, Map<String, Object?>>(
      SettingsController.new,
    );

final settingValueProvider = Provider.family<Object?, String>((
  ref,
  settingKey,
) {
  return ref.watch(settingsControllerProvider)[settingKey];
});
