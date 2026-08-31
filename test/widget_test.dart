import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:novyse/core/auth/onboarding_manager.dart';
import 'package:novyse/main.dart';
import 'package:novyse/pages/app/chat_list_page.dart';

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
    expect(find.byType(ChatListPage), findsNothing);
  });

  testWidgets('logged in user can reach chats page', (tester) async {
    final container = ProviderContainer(
      overrides: [authProvider.overrideWith((ref) => OnboardingManager(true))],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const MyApp()),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(ChatListPage), findsOneWidget);
    expect(find.text('Log in'), findsNothing);
  });
}
