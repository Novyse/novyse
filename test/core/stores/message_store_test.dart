import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/forward_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

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

  group('MessageStore & ForwardStore Tests', () {
    test('messageStore loads and handles realtime updates (new, edit, reaction, delete)', () async {
      await db.chat.add({'uuid': 'chat-1', 'name': 'Test', 'type': 'GROUP'});
      await db.message.add({
        'id': 1,
        'chatUUID': 'chat-1',
        'subID': 0,
        'senderUUID': 'user-1',
        'content': 'Initial message',
      });

      const key = (chatUUID: 'chat-1', subID: 0);
      final notifier = container.read(chatMessagesProvider(key).notifier);
      await notifier.init(dbOverride: db);

      final state = container.read(chatMessagesProvider(key));
      expect(state.messages.length, equals(1));
      expect(state.messages.first.content, equals('Initial message'));

      final bus = container.read(eventBusProvider);

      // 1. New message
      bus.emit(
        const MessageNewEvent({
          'id': 2,
          'chatUUID': 'chat-1',
          'subID': 0,
          'userUUID': 'user-2',
          'content': 'Second message',
          'createdAt': '2026-08-31T12:01:00.000Z',
        }),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(
        container.read(chatMessagesProvider(key)).messages.length,
        equals(2),
      );

      // 2. Edit message
      bus.emit(
        const MessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 0,
          messageID: '2',
          action: 'edit',
          data: {'content': 'Edited second message'},
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(
        container.read(chatMessagesProvider(key)).messages.first.content,
        equals('Edited second message'),
      );
      expect(
        container.read(chatMessagesProvider(key)).messages.first.edited,
        isTrue,
      );

      // 3. Reaction add
      bus.emit(
        const MessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 0,
          messageID: '2',
          action: 'reaction_add',
          data: {'reaction': '🔥', 'userUUID': 'user-3'},
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      final reactions = container
          .read(chatMessagesProvider(key))
          .messages
          .first
          .reactions;
      expect(reactions.length, equals(1));
      expect(reactions.first['emoji'], equals('🔥'));
      expect(reactions.first['userUUIDs'], contains('user-3'));

      // 4. Delete message
      bus.emit(
        const MessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 0,
          messageID: '2',
          action: 'delete',
          data: {},
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(
        container.read(chatMessagesProvider(key)).messages.length,
        equals(1),
      );
    });

    test('forwardProvider manages forward selection and reset', () {
      final forwardNotifier = container.read(forwardProvider.notifier);

      expect(container.read(forwardProvider).isForwarding, isFalse);

      final msg = MessageModel(
        id: 1,
        chatUUID: 'chat-1',
        userUUID: 'user-1',
        createdAt: DateTime.now(),
        content: 'Forward me',
      );

      forwardNotifier.setForwardMessages([msg]);

      expect(container.read(forwardProvider).isForwarding, isTrue);
      expect(
        container.read(forwardProvider).forwardMessages.first.content,
        equals('Forward me'),
      );

      forwardNotifier.resetForwarding();
      expect(container.read(forwardProvider).isForwarding, isFalse);
      expect(container.read(forwardProvider).forwardMessages, isEmpty);
    });
  });
}
