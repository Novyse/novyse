import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/settings/settings_search.dart';

Future<Map<SettingCategory, List<SettingItem>>> _search(
  WidgetTester tester,
  String query,
) async {
  Map<SettingCategory, List<SettingItem>>? out;
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: localizationsDelegates,
      supportedLocales: supportedLocales,
      locale: const Locale('en'),
      home: Builder(
        builder: (context) {
          out = searchSettings(context: context, query: query);
          return const SizedBox();
        },
      ),
    ),
  );
  return out!;
}

void main() {
  group('searchSettings', () {
    testWidgets('blank query returns no results', (tester) async {
      expect(await _search(tester, ''), isEmpty);
      expect(await _search(tester, '   '), isEmpty);
    });

    testWidgets('matches item titles', (tester) async {
      final results = await _search(tester, 'password');
      final ids = results.values
          .expand((items) => items.map((i) => i.id))
          .toList();
      expect(ids, contains('password'));
    });

    testWidgets('matches item subtitles only', (tester) async {
      // 'Zero-knowledge password change' is the password subtitle;
      // 'zero-knowledge' appears in no item title.
      final results = await _search(tester, 'zero-knowledge');
      final ids = results.values
          .expand((items) => items.map((i) => i.id))
          .toList();
      expect(ids, contains('password'));
    });

    testWidgets('is case-insensitive and trims whitespace', (tester) async {
      final lower = await _search(tester, 'password');
      final upper = await _search(tester, '  PASSWORD ');
      expect(
        upper.keys.map((c) => c.id).toList(),
        lower.keys.map((c) => c.id).toList(),
      );
      expect(
        upper.values.expand((i) => i.map((e) => e.id)).toList(),
        lower.values.expand((i) => i.map((e) => e.id)).toList(),
      );
    });

    testWidgets('does not match option labels', (tester) async {
      // 'Midnight OLED' is only an option label of the theme selector.
      expect(await _search(tester, 'oled'), isEmpty);
    });

    testWidgets('does not match category names', (tester) async {
      // 'Diagnostics' only appears in the 'Info & Diagnostics' category title.
      expect(await _search(tester, 'diagnostics'), isEmpty);
    });

    testWidgets('includes disabled (WIP) items', (tester) async {
      final results = await _search(tester, 'password');
      final item = results.values
          .expand((items) => items)
          .firstWhere((i) => i.id == 'password');
      expect(item.disabled, isTrue);
    });

    testWidgets('groups hits by category in catalog order', (tester) async {
      final results = await _search(tester, 'theme');
      expect(results, isNotEmpty);

      final categoryIds = results.keys.map((c) => c.id).toList();
      final catalogOrder = SettingsCatalog.categories.map((c) => c.id).toList();
      expect(
        categoryIds,
        orderedEquals(
          catalogOrder.where((id) => categoryIds.contains(id)).toList(),
        ),
      );

      // Every hit belongs to its group category...
      for (final entry in results.entries) {
        final owned = <String>{
          for (final p in entry.key.pages)
            for (final g in p.groups)
              for (final i in g.items) i.id,
          for (final i in entry.key.items) i.id,
        };
        for (final item in entry.value) {
          expect(owned, contains(item.id));
        }
      }

      // ...and items follow catalog order.
      final ids = results.values
          .expand((items) => items.map((i) => i.id))
          .toList();
      final allIds = SettingsCatalog.allItems.map((i) => i.id).toList();
      expect(
        ids,
        orderedEquals(allIds.where((id) => ids.contains(id)).toList()),
      );
    });
  });
}
