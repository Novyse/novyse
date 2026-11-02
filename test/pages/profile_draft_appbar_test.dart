import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/pages/app/settings/settings_catalog_page.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class _StubUserNotifier extends UserNotifier {
  _StubUserNotifier(this.preset);

  final UserStoreState preset;

  @override
  UserStoreState build() => preset;
}

class _StubSettingsController extends SettingsController {
  _StubSettingsController(this.preset);

  final Map<String, Object?> preset;

  @override
  Map<String, Object?> build() => Map<String, Object?>.of(preset);
}

// Compares by value: some HugeIcons entries hand out a fresh list instance
// on every access, so identity/`==` never matches them.
Finder _hugeIcon(List<List<dynamic>> icon) => find.byWidgetPredicate(
  (w) => w is AppHugeIcon && w.icon.toString() == icon.toString(),
);

Future<void> _pump(WidgetTester tester) async {
  const user = UserModel(uuid: 'u1', name: 'Ada', surname: 'Lovelace');
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        userStoreProvider.overrideWith(
          () => _StubUserNotifier(
            const UserStoreState(
              users: {'u1': user},
              localUserUUID: 'u1',
            ),
          ),
        ),
        settingsControllerProvider.overrideWith(
          () => _StubSettingsController(const {}),
        ),
      ],
      child: const MaterialApp(
        localizationsDelegates: localizationsDelegates,
        supportedLocales: supportedLocales,
        locale: Locale('en'),
        home: SettingsGroupPage(
          categoryId: 'account',
          pageId: 'account_profile',
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('editing a field swaps the app bar to confirm/discard', (
    tester,
  ) async {
    await _pump(tester);

    // Clean state: back arrow, no confirm or discard actions.
    expect(_hugeIcon(HugeIcons.strokeRoundedArrowLeft01), findsOneWidget);
    expect(_hugeIcon(HugeIcons.strokeRoundedTick02), findsNothing);
    expect(_hugeIcon(HugeIcons.strokeRoundedUndo), findsNothing);

    await tester.enterText(find.byType(TextField).first, 'Grace');
    await tester.pumpAndSettle();

    // Dirty state: tick on the right, undo instead of the back arrow.
    expect(_hugeIcon(HugeIcons.strokeRoundedTick02), findsOneWidget);
    expect(_hugeIcon(HugeIcons.strokeRoundedUndo), findsOneWidget);
    expect(_hugeIcon(HugeIcons.strokeRoundedArrowLeft01), findsNothing);
  });

  testWidgets('discard restores the baseline and the plain app bar', (
    tester,
  ) async {
    await _pump(tester);

    await tester.enterText(find.byType(TextField).first, 'Grace');
    await tester.pumpAndSettle();
    expect(find.text('Grace'), findsOneWidget);

    await tester.tap(_hugeIcon(HugeIcons.strokeRoundedUndo));
    await tester.pumpAndSettle();

    expect(find.text('Ada'), findsOneWidget);
    expect(find.text('Grace'), findsNothing);
    expect(_hugeIcon(HugeIcons.strokeRoundedTick02), findsNothing);
    expect(_hugeIcon(HugeIcons.strokeRoundedUndo), findsNothing);
    expect(_hugeIcon(HugeIcons.strokeRoundedArrowLeft01), findsOneWidget);
  });
}
