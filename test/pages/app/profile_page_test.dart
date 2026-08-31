import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/pages/app/profile_page.dart';

void main() {
  testWidgets('ProfilePage renders user details and handles logout', (
    tester,
  ) async {
    final mockUser = UserModel(
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

    // Verify user information is displayed
    expect(find.text('Mario Rossi'), findsOneWidget);
    expect(find.text('@mariorossi'), findsOneWidget);
    expect(find.text('mario@example.com'), findsOneWidget);
    expect(find.text('Software developer'), findsOneWidget);
    expect(find.text('Lombardia'), findsOneWidget);
    expect(find.text('Italy'), findsOneWidget);

    // Verify Logout button exists in AppBar
    final appBarLogout = find.byTooltip('Log out');
    expect(appBarLogout, findsOneWidget);

    // Tap on AppBar logout button
    await tester.tap(appBarLogout);
    await tester.pumpAndSettle();

    // Verify confirmation dialog opens
    expect(find.byType(AlertDialog), findsOneWidget);
    expect(
      find.text('Are you sure you want to log out from your account?'),
      findsOneWidget,
    );

    // Cancel dialog
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.byType(AlertDialog), findsNothing);
  });
}
