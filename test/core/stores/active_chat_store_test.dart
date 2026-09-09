import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  late AppDatabase db;
  late ProviderContainer container;

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();
    container = ProviderContainer(
      overrides: [databaseProvider.overrideWithValue(db)],
    );
  });

  tearDown(() async {
    container.dispose();
    await db.close();
  });

  group('ChatDraftStore & ActiveChatStore Tests', () {
    test('chatDraftProvider isolates draft state per chat', () {
      final draft1Notifier = container.read(
        chatDraftProvider('chat-1').notifier,
      );
      final draft2Notifier = container.read(
        chatDraftProvider('chat-2').notifier,
      );

      draft1Notifier.setText('Draft for chat 1');
      draft2Notifier.setText('Draft for chat 2');

      expect(
        container.read(chatDraftProvider('chat-1')).newMessageText,
        equals('Draft for chat 1'),
      );
      expect(
        container.read(chatDraftProvider('chat-2')).newMessageText,
        equals('Draft for chat 2'),
      );

      final testMsg = MessageModel(
        id: 'msg-10',
        chatUUID: 'chat-1',
        userUUID: 'user-1',
        createdAt: DateTime.now(),
      );
      draft1Notifier.setReplyingTo([ChatReplyItem(message: testMsg)]);
      expect(
        container.read(chatDraftProvider('chat-1')).replyingTo.first.message.id,
        equals('msg-10'),
      );
      expect(container.read(chatDraftProvider('chat-2')).replyingTo, isEmpty);
    });

    test(
      'activeChatProvider manages selection and links to chat data',
      () async {
        await db.chat.add({
          'uuid': 'chat-1',
          'name': 'Design Chat',
          'type': 'GROUP',
        });

        await container.read(chatListProvider.notifier).init();

        final activeNotifier = container.read(activeChatProvider.notifier);

        expect(container.read(activeChatProvider).hasActiveChat, isFalse);

        activeNotifier.setSelectedChatUUID('chat-1');

        expect(
          container.read(activeChatProvider).selectedChatUUID,
          equals('chat-1'),
        );
        expect(container.read(activeChatProvider).hasActiveChat, isTrue);

        final activeChatData = container.read(activeChatDataProvider);
        expect(activeChatData?.name, equals('Design Chat'));

        activeNotifier.clear();
        expect(container.read(activeChatProvider).hasActiveChat, isFalse);
        expect(container.read(activeChatDataProvider), isNull);
      },
    );

    test('setScrollToMessageID stores quote range and clears it on null', () {
      final activeNotifier = container.read(activeChatProvider.notifier);

      activeNotifier.setScrollToMessageID('42', rangeStart: 7, rangeEnd: 16);

      var state = container.read(activeChatProvider);
      expect(state.scrollToMessageID, equals('42'));
      expect(state.scrollToRangeStart, equals(7));
      expect(state.scrollToRangeEnd, equals(16));

      activeNotifier.setScrollToMessageID(null);

      state = container.read(activeChatProvider);
      expect(state.scrollToMessageID, isNull);
      expect(state.scrollToRangeStart, isNull);
      expect(state.scrollToRangeEnd, isNull);
    });

    test('clearScrollTarget clears id and ranges together', () {
      final activeNotifier = container.read(activeChatProvider.notifier);

      activeNotifier.setScrollToMessageID('99', rangeStart: 1, rangeEnd: 2);
      activeNotifier.clearScrollTarget();

      final state = container.read(activeChatProvider);
      expect(state.scrollToMessageID, isNull);
      expect(state.scrollToRangeStart, isNull);
      expect(state.scrollToRangeEnd, isNull);
    });

    test('jumpToMessage sets scroll target with range (reply path)', () {
      final activeNotifier = container.read(activeChatProvider.notifier);

      activeNotifier.jumpToMessage(100, subID: 0, rangeStart: 7, rangeEnd: 16);

      final state = container.read(activeChatProvider);
      expect(state.scrollToMessageID, equals('100'));
      expect(state.scrollToRangeStart, equals(7));
      expect(state.scrollToRangeEnd, equals(16));
    });

    test('jumpToMessage switches sub and vocal view (pinned/search path)', () {
      final activeNotifier = container.read(activeChatProvider.notifier);

      activeNotifier.setSelectedSub(0);
      activeNotifier.setContentView('vocal');

      activeNotifier.jumpToMessage('101', subID: 1);

      final state = container.read(activeChatProvider);
      expect(state.selectedSub, equals(1));
      expect(state.contentView, equals('chat'));
      expect(state.scrollToMessageID, equals('101'));
      expect(state.scrollToRangeStart, isNull);
      expect(state.scrollToRangeEnd, isNull);
    });

    test('jumpToMessage ignores empty ids', () {
      final activeNotifier = container.read(activeChatProvider.notifier);

      activeNotifier.jumpToMessage('');
      expect(container.read(activeChatProvider).scrollToMessageID, isNull);

      activeNotifier.jumpToMessage(null);
      expect(container.read(activeChatProvider).scrollToMessageID, isNull);
    });
  });
}
