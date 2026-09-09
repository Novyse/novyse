import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/message_store.dart';

void main() {
  group('ChatDraftNotifier Multiple Reply & Selection Tests', () {
    late ProviderContainer container;
    const chatUUID = 'test-chat-uuid';

    setUp(() {
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    test('addReply enforces max 3 replies and FIFO eviction', () {
      final notifier = container.read(chatDraftProvider(chatUUID).notifier);

      final msg1 = MessageModel(
        id: 1,
        chatUUID: chatUUID,
        userUUID: 'user-1',
        createdAt: DateTime.now(),
        content: 'First message',
      );
      final msg2 = MessageModel(
        id: 2,
        chatUUID: chatUUID,
        userUUID: 'user-2',
        createdAt: DateTime.now(),
        content: 'Second message',
      );
      final msg3 = MessageModel(
        id: 3,
        chatUUID: chatUUID,
        userUUID: 'user-3',
        createdAt: DateTime.now(),
        content: 'Third message',
      );
      final msg4 = MessageModel(
        id: 4,
        chatUUID: chatUUID,
        userUUID: 'user-4',
        createdAt: DateTime.now(),
        content: 'Fourth message',
      );

      // Add 1st
      notifier.addReply(msg1);
      expect(container.read(chatDraftProvider(chatUUID)).replyingTo.length, 1);
      expect(
        container.read(chatDraftProvider(chatUUID)).replyingTo.first.message.id,
        1,
      );

      // Add 2nd
      notifier.addReply(msg2);
      expect(container.read(chatDraftProvider(chatUUID)).replyingTo.length, 2);

      // Add 3rd
      notifier.addReply(msg3);
      expect(container.read(chatDraftProvider(chatUUID)).replyingTo.length, 3);
      expect(
        container
            .read(chatDraftProvider(chatUUID))
            .replyingTo
            .map((r) => r.message.id)
            .toList(),
        [1, 2, 3],
      );

      // Add 4th -> FIFO eviction drops msg1, keeps [2, 3, 4]
      notifier.addReply(msg4);
      final replies = container.read(chatDraftProvider(chatUUID)).replyingTo;
      expect(replies.length, 3);
      expect(replies.map((r) => r.message.id).toList(), [2, 3, 4]);
    });

    test('addReply avoids adding duplicate reply item', () {
      final notifier = container.read(chatDraftProvider(chatUUID).notifier);
      final msg = MessageModel(
        id: 42,
        chatUUID: chatUUID,
        userUUID: 'user-1',
        createdAt: DateTime.now(),
        content: 'Test message',
      );

      notifier.addReply(msg);
      expect(container.read(chatDraftProvider(chatUUID)).replyingTo.length, 1);

      // Re-add exact same message with no range
      notifier.addReply(msg);
      expect(container.read(chatDraftProvider(chatUUID)).replyingTo.length, 1);

      // Add with rangeStart and rangeEnd (quote)
      notifier.addReply(msg, rangeStart: 0, rangeEnd: 4);
      expect(container.read(chatDraftProvider(chatUUID)).replyingTo.length, 2);

      // Re-add duplicate quote
      notifier.addReply(msg, rangeStart: 0, rangeEnd: 4);
      expect(container.read(chatDraftProvider(chatUUID)).replyingTo.length, 2);
    });

    test('removeReply removes only target reply item', () {
      final notifier = container.read(chatDraftProvider(chatUUID).notifier);

      final msgA = MessageModel(
        id: 100,
        chatUUID: chatUUID,
        userUUID: 'u1',
        createdAt: DateTime.now(),
        content: 'A',
      );
      final msgB = MessageModel(
        id: 200,
        chatUUID: chatUUID,
        userUUID: 'u1',
        createdAt: DateTime.now(),
        content: 'B',
      );
      notifier.addReply(msgA);
      notifier.addReply(msgB);
      expect(container.read(chatDraftProvider(chatUUID)).replyingTo.length, 2);

      notifier.removeReply(100);
      final remaining = container.read(chatDraftProvider(chatUUID)).replyingTo;
      expect(remaining.length, 1);
      expect(remaining.first.message.id, 200);
    });

    test('toggleSelectMessage and clearSelectedMessages work correctly', () {
      final notifier = container.read(chatDraftProvider(chatUUID).notifier);

      final msgA = MessageModel(
        id: 'msg-a',
        chatUUID: chatUUID,
        userUUID: 'u1',
        createdAt: DateTime.now(),
      );
      final msgB = MessageModel(
        id: 'msg-b',
        chatUUID: chatUUID,
        userUUID: 'u2',
        createdAt: DateTime.now(),
      );

      notifier.toggleSelectMessage(msgA);
      expect(
        container.read(chatDraftProvider(chatUUID)).selectedMessages.length,
        1,
      );

      notifier.toggleSelectMessage(msgB);
      expect(
        container.read(chatDraftProvider(chatUUID)).selectedMessages.length,
        2,
      );

      // Toggle msgA off
      notifier.toggleSelectMessage(msgA);
      expect(
        container.read(chatDraftProvider(chatUUID)).selectedMessages.length,
        1,
      );
      expect(
        container.read(chatDraftProvider(chatUUID)).selectedMessages.first,
        msgB,
      );

      // Clear all
      notifier.clearSelectedMessages();
      expect(
        container.read(chatDraftProvider(chatUUID)).selectedMessages,
        isEmpty,
      );
    });
  });
}
