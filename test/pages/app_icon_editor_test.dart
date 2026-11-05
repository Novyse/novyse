import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/pages/app/settings/settings_catalog_page.dart';

class _StubSettingsController extends SettingsController {
  _StubSettingsController(this.preset);

  final Map<String, Object?> preset;
  final Map<String, Object?> writes = {};

  @override
  Map<String, Object?> build() =>
      Map<String, Object?>.of({...SettingsCatalog.defaults, ...preset});

  @override
  Future<bool> set(String settingKey, Object? value) async {
    writes[settingKey] = value;
    state = {...state, settingKey: value};
    return true;
  }
}

late _StubSettingsController _stub;

Future<void> _tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> _pumpEditor(
  WidgetTester tester, {
  Map<String, Object?> preset = const {},
}) async {
  _stub = _StubSettingsController(preset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [settingsControllerProvider.overrideWith(() => _stub)],
      child: const MaterialApp(
        localizationsDelegates: localizationsDelegates,
        supportedLocales: supportedLocales,
        locale: Locale('en'),
        home: SettingsGroupPage(
          categoryId: 'customization',
          pageId: 'customization_app_icon',
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('Customization exposes the App Icon page', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: Locale('en'),
          home: SettingsCategoryPage(categoryId: 'customization'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('App Icon'), findsOneWidget);
    await tester.tap(find.text('App Icon'));
    await tester.pumpAndSettle();

    expect(find.text('Android only preview'), findsOneWidget);
    expect(find.text('Icon'), findsOneWidget);
    expect(find.text('White'), findsWidgets);
    expect(find.text('Dark'), findsOneWidget);
    expect(find.text('Sakura'), findsOneWidget);
  });

  testWidgets('picking an icon persists the setting', (tester) async {
    await _pumpEditor(tester);

    await _tapVisible(tester, find.text('Dark'));
    await tester.pumpAndSettle();

    expect(_stub.writes, {'appearance.appIconId': 'dark'});
  });

  testWidgets('white resets to the installed icon', (tester) async {
    await _pumpEditor(tester, preset: {'appearance.appIconId': 'dark'});

    await tester.ensureVisible(find.text('White'));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(CustomScrollView), const Offset(0, 240));
    await tester.pumpAndSettle();
    await tester.tap(find.text('White'));
    await tester.pumpAndSettle();

    expect(find.text('The default installed icon'), findsWidgets);
    expect(_stub.writes, {'appearance.appIconId': 'white'});
  });
}
