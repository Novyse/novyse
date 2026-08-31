import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/pages/onboarding/welcome.dart';

void main() {
  group('WelcomePage', () {
    testWidgets('renders scan QR text and buttons in English', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: WelcomePage(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Welcome'), findsOneWidget);
      expect(find.text('Scan the QR code to log in'), findsOneWidget);
      expect(find.text('Register'), findsOneWidget);
      expect(find.text('Log in'), findsOneWidget);
    });

    testWidgets('renders scan QR text and buttons in Italian', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('it'),
            home: WelcomePage(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Benvenuto'), findsOneWidget);
      expect(find.text('Scansiona il QR per accedere'), findsOneWidget);
      expect(find.text('Registrati'), findsOneWidget);
      expect(find.text('Accedi'), findsOneWidget);
    });
  });
}
