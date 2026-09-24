import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/utils/platform.dart';

void main() {
  group('SettingsCatalog structure', () {
    test('has ten root categories matching the wiki taxonomy', () {
      expect(SettingsCatalog.categories.length, 10);
      expect(
        SettingsCatalog.categories.map((c) => c.id).toList(),
        [
          'account',
          'chat',
          'customization',
          'storage',
          'security',
          'notifications',
          'comms',
          'system',
          'language',
          'info',
        ],
      );
    });

    test('every category has pages and/or loose items', () {
      for (final category in SettingsCatalog.categories) {
        expect(
          category.pages.isNotEmpty || category.items.isNotEmpty,
          isTrue,
          reason: category.id,
        );
        for (final page in category.pages) {
          expect(page.groups, isNotEmpty, reason: page.id);
          for (final group in page.groups) {
            expect(group.items, isNotEmpty, reason: group.id);
          }
        }
      }
    });

    test('all item ids are unique', () {
      final ids = SettingsCatalog.allItems.map((i) => i.id).toList();
      expect(ids.toSet().length, ids.length);
    });

    test('disabled defaults to false but WIP items are force-disabled', () {
      // Only startup/tray items currently under implementation stay enabled.
      const enabledIds = {'open_startup', 'open_background', 'close_to_tray'};
      for (final item in SettingsCatalog.allItems) {
        if (enabledIds.contains(item.id)) {
          expect(item.disabled, isFalse, reason: item.id);
        } else {
          expect(item.disabled, isTrue, reason: item.id);
        }
      }
    });

    test('system items are desktop-only (linux/windows/macos)', () {
      const systemIds = {
        'open_startup',
        'open_background',
        'close_to_tray',
        'gpu_accel',
        'shortcut_manager',
        'global_hotkeys',
      };
      for (final item in SettingsCatalog.allItems) {
        if (systemIds.contains(item.id)) {
          expect(
            item.supportedOS.map((e) => e.name).toSet(),
            {'linux', 'windows', 'macos'},
            reason: item.id,
          );
        } else {
          // Default: visible everywhere.
          expect(
            item.supportedOS.length,
            AppOS.values.length,
            reason: item.id,
          );
        }
      }
    });

    test('loose category items follow the wiki layout', () {
      final account = SettingsCatalog.findCategory('account')!;
      expect(account.pages.map((p) => p.id).toList(), ['account_profile']);
      expect(
        account.items.map((i) => i.id).toList(),
        ['active_sessions', 'logout', 'delete_profile'],
      );

      final storage = SettingsCatalog.findCategory('storage')!;
      expect(
        storage.pages.map((p) => p.id).toList(),
        ['storage_local', 'storage_cloud'],
      );
      expect(
        storage.items.map((i) => i.id).toList(),
        [
          'wifi_download',
          'mobile_download',
          'roaming_download',
          'save_gallery',
          'reset_db',
        ],
      );

      final language = SettingsCatalog.findCategory('language')!;
      expect(language.pages, isEmpty);
      expect(language.items.map((i) => i.id).toList(), [
        'app_language',
        'hour_format',
        'first_day',
        'spellcheck',
      ]);

      final info = SettingsCatalog.findCategory('info')!;
      expect(info.pages, isEmpty);
      expect(info.items.map((i) => i.id).toList(), [
        'version',
        'release_channel',
        'check_updates',
        'resource_links',
        'export_logs',
      ]);
    });

    test('persisted items always declare a scope', () {
      for (final item in SettingsCatalog.allItems) {
        if (item.settingKey != null) {
          expect(item.scope, isNotNull, reason: item.id);
        }
      }
    });

    test('synchronized keys are unique and well-formed', () {
      final keys = SettingsCatalog.synchronizedKeys;
      expect(keys, isNotEmpty);
      expect(keys.toSet().length, keys.length);
      for (final key in keys) {
        expect(key.contains('.'), isTrue, reason: key);
      }
    });
  });

  group('SettingsCatalog localization', () {
    test('every catalog string has English and Italian copy', () {
      final missing = <String>[];
      final en = lookupAppLocalizations(const Locale('en'));
      final it = lookupAppLocalizations(const Locale('it'));
      void check(String id, String Function(AppLocalizations) text) {
        if (text(en).isEmpty || text(it).isEmpty) missing.add(id);
      }

      void checkItem(SettingItem item) {
        check('${item.id}.title', item.title);
        check('${item.id}.subtitle', item.subtitle);
        for (final option in item.options ?? const []) {
          check('${item.id}.${option.value}', option.label);
        }
      }

      for (final category in SettingsCatalog.categories) {
        check('${category.id}.title', category.title);
        check('${category.id}.subtitle', category.subtitle);
        for (final page in category.pages) {
          check('${page.id}.title', page.title);
          check('${page.id}.subtitle', page.subtitle);
          for (final group in page.groups) {
            check('${group.id}.title', group.title);
            for (final item in group.items) {
              checkItem(item);
            }
          }
        }
        for (final item in category.items) {
          checkItem(item);
        }
      }

      expect(missing, isEmpty, reason: 'Missing translations: $missing');
    });
  });
}
