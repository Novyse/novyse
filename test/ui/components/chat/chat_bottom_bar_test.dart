import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/bottom_bar/chat_bottom_bar.dart';

void main() {
  testWidgets('ChatBottomBar renders input field and sends message', (
    tester,
  ) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: Locale('it'),
          home: Scaffold(body: ChatBottomBar(chatUUID: 'chat-test-1')),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(TextField), findsOneWidget);
    expect(find.byIcon(Icons.send_rounded), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Test message');
    await tester.pump();

    expect(find.text('Test message'), findsOneWidget);
  });
}
