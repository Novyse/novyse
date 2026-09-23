import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/settings/settings_sync.dart';
import 'package:novyse/core/storage/database/database.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  late AppDatabase db;
  late ProviderContainer container;

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();
    container = ProviderContainer();
  });

  tearDown(() async {
    container.dispose();
    await db.close();
  });

  test('loads persisted values on init, seeded with catalog defaults',
      () async {
    await db.settings.upsertSetting(
      key: 'chat.sendWithEnter',
      value: false,
      scope: 'local',
    );

    final notifier = container.read(settingsControllerProvider.notifier);
    await notifier.init();

    final state = container.read(settingsControllerProvider);
    // Persisted value wins over the catalog default (true).
    expect(state['chat.sendWithEnter'], isFalse);
    // Untouched keys keep catalog defaults.
    expect(state['chat.markdownToolbar'], isTrue);
  });

  test('bootstrap applies per-key events after the bulk write', () async {
    final notifier = container.read(settingsControllerProvider.notifier);
    await notifier.init();

    // Bulk path: one DB write, then one event per key.
    await SettingsSync.applyRemoteValues({
      'notifications.privateChats': false,
      'nope.unknown': 1, // dropped before notifying
    });
    // Let the async bus listeners complete.
    await Future<void>.delayed(const Duration(milliseconds: 100));

    final state = container.read(settingsControllerProvider);
    expect(state['notifications.privateChats'], isFalse);
    expect(state.containsKey('nope.unknown'), isFalse);
  });

  test('applies per-key value events, ignoring unknown keys', () async {
    final notifier = container.read(settingsControllerProvider.notifier);
    await notifier.init();

    EventBus.instance.emit(
      const SettingValueUpdateEvent(
        key: 'notifications.privateChats',
        value: false,
      ),
    );
    EventBus.instance.emit(
      const SettingValueUpdateEvent(key: 'nope.unknown', value: 1),
    );
    await Future<void>.delayed(const Duration(milliseconds: 50));

    final state = container.read(settingsControllerProvider);
    expect(state['notifications.privateChats'], isFalse);
    expect(state.containsKey('nope.unknown'), isFalse);
  });

  test('applyRemoteValues writes only allowlisted synchronized keys',
      () async {
    await SettingsSync.applyRemoteValues({
      'notifications.privateChats': false,
      'chat.sendWithEnter': true, // local scope -> dropped
      'nope.unknown': 1, // unknown key -> dropped
    });

    final stored = await db.settings.getAllSettings();
    expect(stored['notifications.privateChats'], isFalse);
    expect(stored.containsKey('chat.sendWithEnter'), isFalse);
    expect(stored.containsKey('nope.unknown'), isFalse);
  });

  test('local set() writes through to SQLite', () async {
    final notifier = container.read(settingsControllerProvider.notifier);
    expect(await notifier.set('chat.sendWithEnter', false), isTrue);

    final stored = await db.settings.getAllSettings();
    expect(stored['chat.sendWithEnter'], isFalse);
    expect(container.read(settingValueProvider('chat.sendWithEnter')), isFalse);
  });
}
