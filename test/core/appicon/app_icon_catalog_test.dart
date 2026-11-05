import 'package:flutter_test/flutter_test.dart';

import 'package:novyse/core/appicon/app_icon_catalog.dart';

void main() {
  group('AppIconCatalog.resolveAlias', () {
    test('maps the ready-made icons to their native aliases', () {
      expect(AppIconCatalog.resolveAlias(iconId: 'dark'), 'AppIconDark');
      expect(AppIconCatalog.resolveAlias(iconId: 'sakura'), 'AppIconSakura');
    });

    test('resolves the default (installed) icon to null', () {
      expect(AppIconCatalog.resolveAlias(iconId: 'white'), isNull);
    });

    test('falls back to the default icon for unknown ids', () {
      expect(AppIconCatalog.resolveAlias(iconId: 'nope'), isNull);
    });
  });

  group('AppIconCatalog resources', () {
    test('exposes one alias per non-default icon', () {
      expect(AppIconCatalog.allAliases, ['AppIconDark', 'AppIconSakura']);
    });

    test('resource names match the generated mipmap files', () {
      expect(
        AppIconCatalog.resourceNameForAlias('AppIconDark'),
        'ic_launcher_dark',
      );
      expect(
        AppIconCatalog.resourceNameForAlias('AppIconSakura'),
        'ic_launcher_sakura',
      );
    });
  });

  group('AppIconCatalog.selectionForAlias', () {
    test('round-trips every generated alias', () {
      for (final alias in AppIconCatalog.allAliases) {
        final selection = AppIconCatalog.selectionForAlias(alias);
        expect(selection, isNotNull, reason: alias);
        expect(AppIconCatalog.resolveAlias(iconId: selection!), alias);
      }
    });

    test('maps null to the default icon', () {
      expect(AppIconCatalog.selectionForAlias(null), 'white');
    });

    test('returns null for unknown aliases', () {
      expect(AppIconCatalog.selectionForAlias(''), isNull);
      expect(AppIconCatalog.selectionForAlias('AppIconNope'), isNull);
    });
  });
}
