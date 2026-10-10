import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/pages/app/profile_page.dart';
import 'package:novyse/ui/components/huge_icon.dart';

void main() {
  testWidgets('ProfilePage renders user details and opens QR modal', (
    tester,
  ) async {
    const mockUser = UserModel(
      uuid: 'user-123',
      name: 'Mario',
      surname: 'Rossi',
      handle: 'mariorossi',
      email: 'mario@example.com',
      biography: 'Software developer',
      region: 'Lombardia',
      country: 'Italy',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [localUserProvider.overrideWithValue(mockUser)],
        child: const MaterialApp(
          localizationsDelegates: [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          supportedLocales: [Locale('en')],
          home: ProfilePage(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify user information actually rendered by the page
    // (name, handle, biography card and country row; email and region
    // are intentionally not shown by the current design).
    expect(find.text('Mario Rossi'), findsOneWidget);
    expect(find.text('@mariorossi'), findsOneWidget);
    expect(find.text('Software developer'), findsOneWidget);
    expect(find.text('Italy'), findsOneWidget);
    expect(find.text('mario@example.com'), findsNothing);

    // Tap the QR button and verify the profile QR modal opens.
    final qrButton = find.byWidgetPredicate(
      (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedQrCode,
    );
    expect(qrButton, findsOneWidget);
    await tester.tap(qrButton);
    await tester.pumpAndSettle();
    expect(find.text('@MARIOROSSI'), findsOneWidget);
  });
}
