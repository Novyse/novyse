import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/message/message_system.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MessageSystem Widget Tests', () {
    testWidgets('renders date type pill', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageSystem(type: 'date', data: 'Today'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Today'), findsOneWidget);
    });

    testWidgets('renders system notification pill', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageSystem(type: 'system', data: 'Alice joined the chat'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Alice joined the chat'), findsOneWidget);
    });

    testWidgets('renders separator-with-lines type', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageSystem(
              type: 'separator-with-lines',
              data: 'Unread Messages',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Unread Messages'), findsOneWidget);
    });
  });
}
