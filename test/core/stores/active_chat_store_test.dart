import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
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

      draft1Notifier.setReplyingTo([
        {'id': 'msg-10'},
      ]);
      expect(
        container.read(chatDraftProvider('chat-1')).replyingTo.first['id'],
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

        await container.read(chatListProvider.notifier).init(dbOverride: db);

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
  });
}
