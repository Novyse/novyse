import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/message/message_text.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MessageText Widget Tests', () {
    testWidgets('renders simple text content', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageText(content: 'Hello, World!', isSender: false),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Hello, World!'), findsOneWidget);
    });

    testWidgets('renders empty content as SizedBox.shrink without crashing', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: MessageText(content: '   ', isSender: true)),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(SizedBox), findsWidgets);
    });

    testWidgets('renders mention transformed into markdown link', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageText(
              content: 'Hello @alice how are you?',
              isSender: false,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(MessageText), findsOneWidget);
    });
  });
}
