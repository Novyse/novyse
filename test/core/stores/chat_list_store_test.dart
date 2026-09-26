import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

class _FakeUserNotifier extends UserNotifier {
  final String myUUID;
  _FakeUserNotifier(this.myUUID);
  @override
  UserStoreState build() => UserStoreState(localUserUUID: myUUID);
}

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
      await notifier.init();

      final state = container.read(chatListProvider);
      expect(state.chats.length, equals(2));

      final chat1 = container.read(chatProvider('chat-1'));
      expect(chat1?.name, equals('Dev Team'));
      expect(chat1?.type, equals('GROUP'));
    });

    test('chat updates (rename, sub_create, message_new, unreadCount, pin) work reactively', () async {
      await db.chat.add({'uuid': 'chat-1', 'name': 'General', 'type': 'GROUP'});

      final notifier = container.read(chatListProvider.notifier);
      await notifier.init();

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
            'sub': {'id': 1, 'name': 'off-topic', 'type': 'TEXT'},
          },
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      final afterSubCreate = container.read(chatProvider('chat-1'));
      expect(afterSubCreate?.subs.length, equals(1));
      expect(afterSubCreate?.subs.first['type'], equals('TEXT'));

      // 3. New message increments unreadCount
      bus.emit(
        const MessageNewEvent({
          'id': 'msg-1',
          'chatUUID': 'chat-1',
          'subID': 0,
          'userUUID': 'user-1',
          'content': 'Hello!',
          'createdAt': '2026-08-31T12:00:00.000Z',
        }),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      final chatAfterMsg = container.read(chatProvider('chat-1'));
      expect(chatAfterMsg?.unreadCount, equals(1));
      expect(chatAfterMsg?.lastMessage?['content'], equals('Hello!'));

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

    test('unread badge follows exact counts without database', () async {
      await db.chat.add({'uuid': 'chat-9', 'name': 'Watermark', 'type': 'DM'});

      final localContainer = ProviderContainer(
        overrides: [
          databaseProvider.overrideWithValue(db),
          userStoreProvider.overrideWith(
            () => _FakeUserNotifier('me'),
          ),
        ],
      );
      addTearDown(localContainer.dispose);

      final notifier = localContainer.read(chatListProvider.notifier);
      await notifier.init();
      final bus = localContainer.read(eventBusProvider);

      Future<void> incoming(int id) async {
        bus.emit(
          MessageNewEvent({
            'id': id,
            'chatUUID': 'chat-9',
            'subID': 0,
            'senderUUID': 'other',
            'content': 'msg $id',
            'created_at': '2026-09-24T10:00:00.000Z',
          }),
        );
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }

      Future<void> read(String id, String reader) async {
        bus.emit(
          MessageUpdateEvent(
            chatUUID: 'chat-9',
            subID: 0,
            messageID: id,
            action: 'read',
            data: {
              'userUUID': reader,
              'readAt': '2026-09-24T10:05:00.000Z',
            },
          ),
        );
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }

      int badge() =>
          localContainer.read(chatProvider('chat-9'))?.unreadCount ?? -1;

      await incoming(11);
      await incoming(12);
      expect(badge(), equals(2));

      // Someone else's read leaves everything untouched.
      await read('12', 'other');
      expect(badge(), equals(2));

      // A local read event moves only the watermark: the badge waits for the
      // exact count. Proof: already-covered ids never recount...
      await read('12', 'me');
      expect(badge(), equals(2));
      await incoming(12);
      expect(badge(), equals(2));

      // ...while applyRead scales the badge by the exact reported count.
      notifier.applyRead('chat-9', 0, 11, 1);
      expect(badge(), equals(1));
      notifier.applyRead('chat-9', 0, 12, 1);
      expect(badge(), equals(0));

      // Overshoot clamps at zero instead of going negative.
      notifier.applyRead('chat-9', 0, 99, 5);
      expect(badge(), equals(0));

      // New arrivals count again from the advanced watermark (99): older
      // ids never recount.
      await incoming(101);
      expect(badge(), equals(1));
      await incoming(13);
      expect(badge(), equals(1));
    });

    test('notification mark-as-read decrements the badge exactly once', () async {
      await db.chat.add({'uuid': 'chat-7', 'name': 'Notify', 'type': 'DM'});

      final localContainer = ProviderContainer(
        overrides: [
          databaseProvider.overrideWithValue(db),
          userStoreProvider.overrideWith(
            () => _FakeUserNotifier('me'),
          ),
        ],
      );
      addTearDown(localContainer.dispose);

      final notifier = localContainer.read(chatListProvider.notifier);
      await notifier.init();
      final bus = localContainer.read(eventBusProvider);

      int badge() =>
          localContainer.read(chatProvider('chat-7'))?.unreadCount ?? -1;

      Future<void> incoming(int id) async {
        bus.emit(
          MessageNewEvent({
            'id': id,
            'chatUUID': 'chat-7',
            'subID': 0,
            'senderUUID': 'other',
            'content': 'msg $id',
            'created_at': '2026-09-24T10:00:00.000Z',
          }),
        );
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }

      Future<void> decrement(int targetId) async {
        bus.emit(
          ChatBadgeDecrementEvent(
            chatUUID: 'chat-7',
            subID: 0,
            targetId: targetId,
            count: 1,
          ),
        );
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }

      await incoming(21);
      await incoming(22);
      expect(badge(), equals(2));

      await decrement(21);
      expect(badge(), equals(1));

      // Repeat of an already-covered target: idempotent, badge untouched.
      await decrement(21);
      expect(badge(), equals(1));

      await decrement(22);
      expect(badge(), equals(0));
    });

    test('badge drops when the generic read event precedes the decrement', () async {
      await db.chat.add({'uuid': 'chat-8', 'name': 'Race', 'type': 'DM'});

      final localContainer = ProviderContainer(
        overrides: [
          databaseProvider.overrideWithValue(db),
          userStoreProvider.overrideWith(
            () => _FakeUserNotifier('me'),
          ),
        ],
      );
      addTearDown(localContainer.dispose);

      await localContainer.read(chatListProvider.notifier).init();
      final bus = localContainer.read(eventBusProvider);

      int badge() =>
          localContainer.read(chatProvider('chat-8'))?.unreadCount ?? -1;

      bus.emit(
        MessageNewEvent({
          'id': 31,
          'chatUUID': 'chat-8',
          'subID': 0,
          'senderUUID': 'other',
          'content': 'hello',
          'created_at': '2026-09-24T10:00:00.000Z',
        }),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(badge(), equals(1));

      // The service emits the generic 'read' first (watermark advances)...
      bus.emit(
        const MessageUpdateEvent(
          chatUUID: 'chat-8',
          subID: 0,
          messageID: '31',
          action: 'read',
          data: {'userUUID': 'me', 'readAt': '2026-09-24T10:05:00.000Z'},
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(badge(), equals(1));

      // ...then the decrement event. A watermark gate here would see
      // targetId <= watermark and wrongly skip: the badge must still drop.
      bus.emit(
        const ChatBadgeDecrementEvent(
          chatUUID: 'chat-8',
          subID: 0,
          targetId: 31,
          count: 1,
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(badge(), equals(0));
    });
  });
}
