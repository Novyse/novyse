import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/ui/components/chat/message/message_base.dart';
import 'package:novyse/ui/components/chat/message/message_reply.dart';
import 'package:novyse/ui/components/chat/message/message_text.dart';

void main() {
  group('Reply Tap Navigation & Highlighting Tests', () {
    testWidgets('MessageReply onTap callback fires on tap', (tester) async {
      bool tapped = false;
      final replyMsg = MessageModel(
        id: 42,
        chatUUID: 'chat-1',
        subID: 0,
        userUUID: 'user-1',
        content: 'Original message',
        type: 'message',
        createdAt: DateTime.parse('2026-09-06T12:00:00Z'),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MessageReply(
              senderName: 'Alice',
              message: replyMsg,
              messageID: 42,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Alice'), findsOneWidget);
      expect(find.text('Original message'), findsOneWidget);

      await tester.tap(find.text('Original message'));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets(
      'MessageText renders quoted text highlight when quoteHighlightRange is active',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: MessageText(
                content: 'Hello beautiful world',
                isCurrentMatch: true,
                quoteHighlightRange: const TextRange(start: 6, end: 15),
              ),
            ),
          ),
        );

        // Verify Text.rich was built with spans
        final textFinder = find.byType(Text);
        expect(textFinder, findsOneWidget);

        final textWidget = tester.widget<Text>(textFinder);
        final textSpan = textWidget.textSpan! as TextSpan;
        expect(textSpan.children, isNotNull);
        expect(textSpan.children!.length, equals(3));
        expect((textSpan.children![0] as TextSpan).text, equals('Hello '));
        expect((textSpan.children![1] as TextSpan).text, equals('beautiful'));
        expect((textSpan.children![2] as TextSpan).text, equals(' world'));
      },
    );

    testWidgets('MessageBase forwards onReplyTap when tapping MessageReply', (
      tester,
    ) async {
      int? tappedMessageId;
      int? tappedStart;
      int? tappedEnd;

      final originalMsg = MessageModel(
        id: 100,
        chatUUID: 'chat-1',
        subID: 0,
        userUUID: 'user-1',
        content: 'Target message to quote',
        type: 'message',
        createdAt: DateTime.parse('2026-09-06T12:00:00Z'),
      );

      final msgWithReply = MessageModel(
        id: 101,
        chatUUID: 'chat-1',
        subID: 0,
        userUUID: 'user-2',
        content: 'My reply to you',
        type: 'message',
        createdAt: DateTime.parse('2026-09-06T12:01:00Z'),
        replyTos: [
          {
            'chatUUID': 'chat-1',
            'subID': 0,
            'messageID': 100,
            'rangeStart': 7,
            'rangeEnd': 16,
          },
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            locale: const Locale('en'),
            home: Scaffold(
              body: MessageBase(
                message: msgWithReply,
                getMessage: (c, s, id) => id == 100 ? originalMsg : null,
                onReplyTap:
                    ({
                      required chatUUID,
                      required subID,
                      required messageID,
                      rangeStart,
                      rangeEnd,
                    }) {
                      tappedMessageId = messageID;
                      tappedStart = rangeStart;
                      tappedEnd = rangeEnd;
                    },
              ),
            ),
          ),
        ),
      );

      expect(find.byType(MessageReply), findsOneWidget);

      await tester.tap(find.byType(MessageReply));
      await tester.pump();

      expect(tappedMessageId, equals(100));
      expect(tappedStart, equals(7));
      expect(tappedEnd, equals(16));
    });
  });
}
