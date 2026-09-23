import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/storage/database/database.dart';

/// In-memory mirror of settings values for the UI.
class SettingsController extends StateNotifier<Map<String, Object?>> {
  final Ref _ref;
  final List<StreamSubscription> _subscriptions = [];
  Future<void>? _initFuture;

  SettingsController(this._ref)
      : super(Map<String, Object?>.from(SettingsCatalog.defaults)) {
    _ref.onDispose(() {
      for (final sub in _subscriptions) {
        sub.cancel();
      }
      _subscriptions.clear();
    });
    final bus = _ref.read(eventBusProvider);
    _subscriptions.add(
      bus.on<SettingValueUpdateEvent>().listen(_onRemoteValue),
    );
    Future.microtask(() => init());
  }

  AppDatabase get _db => _ref.read(databaseProvider);

  Future<void> init() => _initFuture ??= _load();

  Future<void> _load() async {
    try {
      if (!_db.isOpen) await _db.initialize();
      final stored = await _db.settings.getAllSettings();
      if (!mounted) return;
      state = {...SettingsCatalog.defaults, ...stored};
    } catch (e) {
      debugPrint('[SettingsController] init failed: $e');
      if (!mounted) return;
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

  void _onRemoteValue(SettingValueUpdateEvent event) {
    if (!mounted) return;
    final item = SettingsCatalog.findBySettingKey(event.key);
    if (item == null) return;
    if (item.scope != SettingScope.synchronized) return;
    state = {...state, event.key: event.value};
  }
}

final settingsControllerProvider =
    StateNotifierProvider<SettingsController, Map<String, Object?>>(
  (ref) => SettingsController(ref),
);

final settingValueProvider =
    Provider.family<Object?, String>((ref, settingKey) {
  return ref.watch(settingsControllerProvider)[settingKey];
});
