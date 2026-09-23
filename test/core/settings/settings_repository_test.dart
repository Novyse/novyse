import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:novyse/core/storage/database/database.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  late AppDatabase db;

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();
  });

  tearDown(() async {
    await db.close();
  });

  group('SettingsLocalRepository', () {
    test('creates settings table and drops the outbox via migration', () async {
      final tables = await db.rawDb!.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='table';",
      );
      final names = tables.map((t) => t['name'] as String).toList();
      expect(names, contains('local_settings'));
      expect(names, isNot(contains('pending_setting_mutations')));
    });

    test('upserts and reads back settings', () async {
      expect(
        await db.settings.upsertSetting(
          key: 'chat.sendWithEnter',
          value: true,
          scope: 'local',
        ),
        isTrue,
      );
      expect(
        await db.settings.upsertSetting(
          key: 'chat.sendWithEnter',
          value: false,
          scope: 'local',
        ),
        isTrue,
      );

      final all = await db.settings.getAllSettings();
      expect(all['chat.sendWithEnter'], isFalse);
    });

    test('upsertAll writes many values with one call', () async {
      expect(
        await db.settings.upsertAll(
          values: {
            'chat.markdownToolbar': true,
            'notifications.privateChats': false,
          },
          scope: 'synchronized',
        ),
        isTrue,
      );

      final all = await db.settings.getAllSettings();
      expect(all['chat.markdownToolbar'], isTrue);
      expect(all['notifications.privateChats'], isFalse);
    });

    test('clearAll wipes settings', () async {
      await db.settings.upsertSetting(
        key: 'a.key',
        value: 1,
        scope: 'synchronized',
      );

      expect(await db.settings.clearAll(), isTrue);
      expect(await db.settings.getAllSettings(), isEmpty);
    });
  });
}
