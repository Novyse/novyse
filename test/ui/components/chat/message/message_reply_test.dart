import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/ui/components/chat/message/message_reply.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final dummyMessage = MessageModel(
    id: 10,
    chatUUID: 'chat-1',
    userUUID: 'user-1',
    content: 'The quick brown fox jumps over the lazy dog',
    createdAt: DateTime.now(),
  );

  group('MessageReply Widget Tests', () {
    testWidgets('renders reply preview with sender name and full text', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MessageReply(senderName: 'Bob', message: dummyMessage),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Bob'), findsOneWidget);
      expect(
        find.text('The quick brown fox jumps over the lazy dog'),
        findsOneWidget,
      );
    });

    testWidgets(
      'renders partial quote when rangeStart and rangeEnd are given',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: MessageReply(
                senderName: 'Bob',
                message: dummyMessage,
                rangeStart: 4,
                rangeEnd: 19, // 'quick brown fox'
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('quick brown fox'), findsOneWidget);
      },
    );

    testWidgets('triggers onTap callback when tapped', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MessageReply(
              senderName: 'Bob',
              message: dummyMessage,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byType(MessageReply));
      await tester.pump();

      expect(tapped, isTrue);
    });
  });
}
