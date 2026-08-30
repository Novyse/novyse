import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:novyse/core/auth_service.dart';
import 'package:novyse/main.dart';

void main() {
  testWidgets('guest user is redirected to login', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const MyApp()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Login'), findsOneWidget);
    expect(find.text('Sei autenticato'), findsNothing);
  });

  testWidgets('logged in user can reach home', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    container.read(authProvider.notifier).login();

    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const MyApp()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sei autenticato'), findsOneWidget);
    expect(find.text('Login'), findsNothing);
  });
}
