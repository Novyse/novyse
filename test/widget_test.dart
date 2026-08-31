import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:novyse/core/auth/onboarding_manager.dart';
import 'package:novyse/main.dart';

void main() {
  testWidgets('guest user is redirected to login', (tester) async {
    final container = ProviderContainer(
      overrides: [authProvider.overrideWith((ref) => OnboardingManager(false))],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const MyApp()),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Log in'), findsOneWidget);
    expect(find.text('Sei autenticato'), findsNothing);
  });

  testWidgets('logged in user can reach home', (tester) async {
    final container = ProviderContainer(
      overrides: [authProvider.overrideWith((ref) => OnboardingManager(true))],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const MyApp()),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Sei autenticato'), findsOneWidget);
    expect(find.text('Log in'), findsNothing);
  });
}
