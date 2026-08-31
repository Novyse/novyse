import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/onboarding/onboarding_auth_card.dart';

void main() {
  testWidgets(
    'OnboardingAuthCard login mode renders username and password fields',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: SingleChildScrollView(
                child: OnboardingAuthCard(
                  initialMode: OnboardingAuthMode.login,
                  showTurnstile: false,
                ),
              ),
            ),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Log in'), findsWidgets);
      expect(find.text('Back'), findsOneWidget);
      expect(find.text('Username'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('OPAQUE'), findsOneWidget);
      expect(find.text('Email'), findsNothing);
    },
  );
}
