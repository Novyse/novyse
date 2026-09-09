import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_pinned_messages_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_sub_header.dart';
import 'package:novyse/ui/components/huge_icon.dart';

void main() {
  Widget buildTestWidget({
    required String chatUUID,
    required ProviderContainer container,
    bool testSubHeader = false,
  }) {
    return UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: const Locale('en'),
        home: Scaffold(
          body: testSubHeader
              ? ChatSubHeader(chatUUID: chatUUID)
              : ChatPinnedMessagesBar(chatUUID: chatUUID),
        ),
      ),
    );
  }

  group('ChatPinnedMessagesBar Widget Tests', () {
    const chatUUID = 'chat-test-123';

    testWidgets('renders SizedBox.shrink when no pinned messages exist', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatListProvider.notifier).state = const ChatListState(
        chats: [
          ChatModel(uuid: chatUUID, name: 'Test Chat', pinnedMessages: []),
        ],
      );

      await tester.pumpWidget(
        buildTestWidget(chatUUID: chatUUID, container: container),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ChatPinnedMessagesBar), findsOneWidget);
      expect(find.text('Pinned message'), findsNothing);
    });

    testWidgets('renders single pinned message and its content', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatListProvider.notifier).state = const ChatListState(
        chats: [
          ChatModel(
            uuid: chatUUID,
            name: 'Test Chat',
            pinnedMessages: [
              {
                'chatUUID': chatUUID,
                'subID': 0,
                'messageID': 101,
                'pinnedAt': '2026-09-09T10:00:00Z',
              },
            ],
          ),
        ],
      );

      container
          .read(chatMessagesProvider((chatUUID: chatUUID, subID: 0)).notifier)
          .state = MessageListState(
        messages: [
          MessageModel(
            id: 101,
            chatUUID: chatUUID,
            subID: 0,
            userUUID: 'user-1',
            content: 'Important pinned announcement',
            createdAt: DateTime.now(),
            pinned: true,
          ),
        ],
      );

      await tester.pumpWidget(
        buildTestWidget(chatUUID: chatUUID, container: container),
      );
      await tester.pumpAndSettle();

      expect(find.text('Pinned message'), findsOneWidget);
      expect(find.text('Important pinned announcement'), findsOneWidget);
      // Only 1 pinned message, so no chevrons
      final prevButtons = find.byWidgetPredicate(
        (w) =>
            w is IconButton &&
            w.icon is AppHugeIcon &&
            (w.icon as AppHugeIcon).icon == HugeIcons.strokeRoundedArrowLeft02,
      );
      expect(prevButtons, findsNothing);
    });

    testWidgets(
      'renders counter and navigates between multiple pinned messages',
      (tester) async {
        final container = ProviderContainer();
        addTearDown(container.dispose);

        container.read(chatListProvider.notifier).state = const ChatListState(
          chats: [
            ChatModel(
              uuid: chatUUID,
              name: 'Test Chat',
              pinnedMessages: [
                {'chatUUID': chatUUID, 'subID': 0, 'messageID': 101},
                {'chatUUID': chatUUID, 'subID': 0, 'messageID': 102},
              ],
            ),
          ],
        );

        container
            .read(chatMessagesProvider((chatUUID: chatUUID, subID: 0)).notifier)
            .state = MessageListState(
          messages: [
            MessageModel(
              id: 101,
              chatUUID: chatUUID,
              subID: 0,
              userUUID: 'user-1',
              content: 'First pinned message',
              createdAt: DateTime.now(),
              pinned: true,
            ),
            MessageModel(
              id: 102,
              chatUUID: chatUUID,
              subID: 0,
              userUUID: 'user-1',
              content: 'Second pinned message',
              createdAt: DateTime.now(),
              pinned: true,
            ),
          ],
        );

        await tester.pumpWidget(
          buildTestWidget(chatUUID: chatUUID, container: container),
        );
        await tester.pumpAndSettle();

        // By default shows the latest pinned message (index 1 / 2) -> "2 / 2"
        expect(find.text('2 / 2'), findsOneWidget);
        expect(find.text('Second pinned message'), findsOneWidget);

        // Tap Prev
        final prevButtons = find.byWidgetPredicate(
          (w) =>
              w is IconButton &&
              w.icon is AppHugeIcon &&
              (w.icon as AppHugeIcon).icon ==
                  HugeIcons.strokeRoundedArrowLeft02,
        );
        expect(prevButtons, findsOneWidget);
        await tester.tap(prevButtons);
        await tester.pumpAndSettle();

        // Now at index 0 -> "1 / 2" and showing first message
        expect(find.text('1 / 2'), findsOneWidget);
        expect(find.text('First pinned message'), findsOneWidget);
      },
    );

    testWidgets(
      'tapping pinned bar sets scrollToMessageID in ActiveChatStore',
      (tester) async {
        final container = ProviderContainer();
        addTearDown(container.dispose);

        container.read(chatListProvider.notifier).state = const ChatListState(
          chats: [
            ChatModel(
              uuid: chatUUID,
              name: 'Test Chat',
              pinnedMessages: [
                {'chatUUID': chatUUID, 'subID': 0, 'messageID': 101},
              ],
            ),
          ],
        );

        container
            .read(chatMessagesProvider((chatUUID: chatUUID, subID: 0)).notifier)
            .state = MessageListState(
          messages: [
            MessageModel(
              id: 101,
              chatUUID: chatUUID,
              subID: 0,
              userUUID: 'user-1',
              content: 'Pinned message to scroll to',
              createdAt: DateTime.now(),
              pinned: true,
            ),
          ],
        );

        await tester.pumpWidget(
          buildTestWidget(chatUUID: chatUUID, container: container),
        );
        await tester.pumpAndSettle();

        // Tap the bar
        await tester.tap(find.text('Pinned message'));
        await tester.pumpAndSettle();

        final activeState = container.read(activeChatProvider);
        expect(activeState.scrollToMessageID, equals('101'));
      },
    );

    test('ChatListNotifier onMessageUpdate handles pin_add and pin_remove reactively', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(chatListProvider.notifier);
      notifier.state = const ChatListState(
        chats: [
          ChatModel(uuid: chatUUID, name: 'Test Chat', pinnedMessages: []),
        ],
      );

      // 1. Add pin
      notifier.onMessageUpdate(chatUUID, 0, '201', 'pin_add', {
        'pinnedAt': '2026-09-09T11:00:00Z',
        'userUUID': 'user-1',
      });

      var chat = container.read(chatProvider(chatUUID));
      expect(chat?.pinnedMessages.length, equals(1));
      expect(chat?.pinnedMessages.first['messageID'], equals(201));

      // 2. Remove pin
      notifier.onMessageUpdate(chatUUID, 0, '201', 'pin_remove', {});

      chat = container.read(chatProvider(chatUUID));
      expect(chat?.pinnedMessages, isEmpty);
    });

    testWidgets(
      'ChatSubHeader renders unified pill with pinned messages and placeholders',
      (tester) async {
        final container = ProviderContainer();
        addTearDown(container.dispose);

        container.read(chatListProvider.notifier).state = const ChatListState(
          chats: [
            ChatModel(
              uuid: chatUUID,
              name: 'Test Chat',
              pinnedMessages: [
                {'chatUUID': chatUUID, 'subID': 0, 'messageID': 101},
              ],
            ),
          ],
        );

        container
            .read(chatMessagesProvider((chatUUID: chatUUID, subID: 0)).notifier)
            .state = MessageListState(
          messages: [
            MessageModel(
              id: 101,
              chatUUID: chatUUID,
              subID: 0,
              userUUID: 'user-1',
              content: 'Announcement in sub-header',
              createdAt: DateTime.now(),
              pinned: true,
            ),
          ],
        );

        await tester.pumpWidget(
          buildTestWidget(
            chatUUID: chatUUID,
            container: container,
            testSubHeader: true,
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byType(ChatSubHeader), findsOneWidget);
        expect(find.text('Pinned message'), findsOneWidget);
        expect(find.text('Announcement in sub-header'), findsOneWidget);
      },
    );

    testWidgets(
      'pinned messages are sorted ascending by pinnedAt so the latest is last',
      (tester) async {
        final container = ProviderContainer();
        addTearDown(container.dispose);

        // Add pinned messages in reverse order (newer first, older second)
        container.read(chatListProvider.notifier).state = const ChatListState(
          chats: [
            ChatModel(
              uuid: chatUUID,
              name: 'Test Chat',
              pinnedMessages: [
                {
                  'chatUUID': chatUUID,
                  'subID': 0,
                  'messageID': 101,
                  'pinnedAt': '2026-09-09T10:00:00Z',
                },
                {
                  'chatUUID': chatUUID,
                  'subID': 0,
                  'messageID': 102,
                  'pinnedAt': '2026-09-09T12:00:00Z',
                },
              ],
            ),
          ],
        );

        container
            .read(chatMessagesProvider((chatUUID: chatUUID, subID: 0)).notifier)
            .state = MessageListState(
          messages: [
            MessageModel(
              id: 101,
              chatUUID: chatUUID,
              subID: 0,
              userUUID: 'user-1',
              content: 'Old pin',
              createdAt: DateTime.now(),
              pinned: true,
            ),
            MessageModel(
              id: 102,
              chatUUID: chatUUID,
              subID: 0,
              userUUID: 'user-1',
              content: 'New pin',
              createdAt: DateTime.now(),
              pinned: true,
            ),
          ],
        );

        await tester.pumpWidget(
          buildTestWidget(chatUUID: chatUUID, container: container),
        );
        await tester.pumpAndSettle();

        // The last message (index length - 1) must be the most recently pinned (New pin)
        expect(find.text('2 / 2'), findsOneWidget);
        expect(find.text('New pin'), findsOneWidget);
      },
    );
  });
}
