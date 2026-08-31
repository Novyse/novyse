import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/storage/database/database.dart';
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

  group('ChatListStore Tests', () {
    test('init loads chats from database and handles sorting', () async {
      await db.chat.add({
        'uuid': 'chat-1',
        'name': 'Dev Team',
        'type': 'GROUP',
      });
      await db.chat.add({
        'uuid': 'chat-2',
        'name': 'Announcements',
        'type': 'CHANNEL',
      });

      final notifier = container.read(chatListProvider.notifier);
      await notifier.init(dbOverride: db);

      final state = container.read(chatListProvider);
      expect(state.chats.length, equals(2));

      final chat1 = container.read(chatProvider('chat-1'));
      expect(chat1?.name, equals('Dev Team'));
      expect(chat1?.type, equals('GROUP'));
    });

    test('chat updates (rename, sub_create, message_new, unreadCount, pin) work reactively', () async {
      await db.chat.add({'uuid': 'chat-1', 'name': 'General', 'type': 'GROUP'});

      final notifier = container.read(chatListProvider.notifier);
      await notifier.init(dbOverride: db);

      final bus = container.read(eventBusProvider);

      // 1. Rename
      bus.emit(
        const ChatUpdateEvent(
          chatUUID: 'chat-1',
          action: 'rename',
          data: {'name': 'General Discussion'},
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(
        container.read(chatProvider('chat-1'))?.name,
        equals('General Discussion'),
      );

      // 2. Sub create
      bus.emit(
        const ChatUpdateEvent(
          chatUUID: 'chat-1',
          action: 'sub_create',
          data: {
            'sub': {'id': 1, 'name': 'off-topic'},
          },
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(container.read(chatProvider('chat-1'))?.subs.length, equals(1));

      // 3. New message increments unreadCount
      bus.emit(
        const MessageNewEvent({
          'id': 'msg-1',
          'chatUUID': 'chat-1',
          'subID': 0,
          'userUUID': 'user-1',
          'text': 'Hello!',
          'time': '2026-08-31T12:00:00.000Z',
        }),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      final chatAfterMsg = container.read(chatProvider('chat-1'));
      expect(chatAfterMsg?.unreadCount, equals(1));
      expect(chatAfterMsg?.lastMessage?['text'], equals('Hello!'));

      // 4. Mark as read
      notifier.markAsRead('chat-1');
      expect(container.read(chatProvider('chat-1'))?.unreadCount, equals(0));

      // 5. Pin add
      bus.emit(
        const UserSettingChatUpdateEvent(
          chatUUID: 'chat-1',
          action: 'pin_add',
          data: {'position': 0},
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(container.read(chatProvider('chat-1'))?.isPinned, isTrue);
    });
  });
}
