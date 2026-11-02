import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/settings/settings_item_renderer.dart';
import 'package:novyse/ui/components/settings/settings_text_input_row.dart';

class _StubUserNotifier extends UserNotifier {
  _StubUserNotifier(this.preset);

  final UserStoreState preset;

  @override
  UserStoreState build() => preset;
}

SettingItem _item(String id) {
  final page = SettingsCatalog.findCategory('account')!.pages.single;
  return page.groups
      .expand((group) => group.items)
      .firstWhere((entry) => entry.id == id);
}

Future<void> _pump(
  WidgetTester tester,
  SettingItem item, {
  UserModel? localUser,
}) async {
  final state = UserStoreState(
    users: localUser == null ? const {} : {localUser.uuid: localUser},
    localUserUUID: localUser?.uuid ?? '',
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        userStoreProvider.overrideWith(() => _StubUserNotifier(state)),
      ],
      child: MaterialApp(
        localizationsDelegates: localizationsDelegates,
        supportedLocales: supportedLocales,
        locale: const Locale('en'),
        home: Scaffold(body: SettingsItemRenderer(item: item)),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('first and last name render inline and pre-filled', (
    tester,
  ) async {
    const user = UserModel(uuid: 'u1', name: 'Ada', surname: 'Lovelace');

    bool isEnabled() => tester
        .widgetList<IgnorePointer>(find.byType(IgnorePointer))
        .where((w) => w.ignoring)
        .isEmpty;

    await _pump(tester, _item('first_name'), localUser: user);
    expect(find.byType(SettingsTextInputRow), findsOneWidget);
    expect(find.text('Ada'), findsOneWidget);
    // Enabled rows are never wrapped in an ignoring pointer.
    expect(isEnabled(), isTrue);

    await _pump(tester, _item('last_name'), localUser: user);
    expect(find.byType(SettingsTextInputRow), findsOneWidget);
    expect(find.text('Lovelace'), findsOneWidget);
    expect(isEnabled(), isTrue);
  });

  testWidgets('name rows stay editable and show hints when empty', (
    tester,
  ) async {
    await _pump(tester, _item('first_name'));

    expect(find.text('Enter your name'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Grace');
    expect(find.text('Grace'), findsOneWidget);
  });

  testWidgets('biography renders multi-line and pre-filled', (tester) async {
    const user = UserModel(uuid: 'u1', name: 'Ada', biography: 'Math');
    await _pump(tester, _item('biography'), localUser: user);

    expect(find.byType(SettingsTextInputRow), findsOneWidget);
    expect(find.text('Math'), findsOneWidget);
    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.minLines, 4);
    expect(field.maxLines, 4);
    // No background, padding or hover chrome — only text styling.
    final decoration = field.decoration!;
    expect(decoration.filled, isFalse);
    expect(decoration.fillColor, Colors.transparent);
    expect(decoration.hoverColor, Colors.transparent);
    expect(decoration.isCollapsed, isTrue);
    expect(decoration.contentPadding, EdgeInsets.zero);
    expect(decoration.border, isA<InputBorder>().having(
      (b) => b.borderSide,
      'borderSide',
      BorderSide.none,
    ));
  });
}
