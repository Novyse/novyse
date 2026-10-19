import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Read-receipt regression tests.
///
/// Read receipts reach the client through two paths:
///  * the `MESSAGE_READ` chat event (socket, and `/user/update` for existing
///    chats) → [GlobalEventEmitter.message.update] with action `read`;
///  * the `reads` array embedded in a message payload (`/user/update`, and
///    notably the *new chats* branch) → `message.addMultiple`.
///
/// Both must end up in `message_read`, where the enrichment expands the stored
/// watermark with `messageID >= ?`.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase db;
  late GlobalEventEmitter emitter;

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();
    await db.chat.add({'uuid': 'chat-1', 'type': 'GROUP', 'name': 'Chat 1'});
    await db.message.add({
      'id': 1,
      'chatUUID': 'chat-1',
      'subID': 0,
      'senderUUID': 'me',
      'content': 'Hello',
      'created_at': '2026-01-01T00:00:00Z',
    });
    emitter = GlobalEventEmitter(EventBus.instance, db);
  });

  tearDown(() async {
    await db.close();
  });

  Future<int> cursor() async {
    final rows = await db.event.db.rawQuery(
      'SELECT eventID FROM chat WHERE uuid = ?;',
      ['chat-1'],
    );
    return (rows.first['eventID'] as num?)?.toInt() ?? 0;
  }

  Future<List<Map<String, Object?>>> rawReads() => db.event.db.rawQuery(
    'SELECT * FROM message_read WHERE chatUUID = ?;',
    ['chat-1'],
  );

  group('MESSAGE_READ chat event', () {
    test('persists the receipt and advances the sync cursor', () async {
      await emitter.message.update('chat-1', 0, '1', 'read', 700, {
        'userUUID': 'peer',
        'readAt': '2026-01-01T00:00:00Z',
      });

      final stored = await rawReads();
      expect(stored, hasLength(1));
      expect(stored.first['userUUID'], 'peer');
      expect(stored.first['messageID'], 1);
      expect(await cursor(), 700);
    });

    test('does not duplicate the row when the receipt arrives again', () async {
      await emitter.message.update('chat-1', 0, '1', 'read', 1, {
        'userUUID': 'peer',
        'readAt': '2026-01-01T00:00:00Z',
      });
      await emitter.message.update('chat-1', 0, '1', 'read', 2, {
        'userUUID': 'peer',
        'readAt': '2026-01-02T00:00:00Z',
      });

      final stored = await rawReads();
      expect(stored, hasLength(1));
    });
  });

  group('embedded message reads (delta sync payload)', () {
    test('are stored and exposed by the enriched message', () async {
      await db.message.addMultiple([
        {
          'chatUUID': 'chat-1',
          'subID': 0,
          'id': 1,
          'senderUUID': 'me',
          'content': 'Hello',
          'created_at': '2026-01-01T00:00:00Z',
          'reads': [
            {'userUUID': 'peer', 'readAt': '2026-01-01T01:00:00Z'},
          ],
        },
      ]);

      final message = await db.message.get.by.id('chat-1', 0, 1);
      expect(message, isNotNull);
      expect(message!['reads'], hasLength(1));
      expect((message['reads'] as List).first['userUUID'], 'peer');
    });

    test('act as a watermark for older messages', () async {
      await db.message.add({
        'id': 2,
        'chatUUID': 'chat-1',
        'subID': 0,
        'senderUUID': 'me',
        'content': 'Second',
        'created_at': '2026-01-01T02:00:00Z',
      });

      // The peer read up to message 2 (watermark stored on message 2).
      await db.message.read.add('chat-1', 0, 2, 'peer', '2026-01-01T03:00:00Z');

      final first = await db.message.get.by.id('chat-1', 0, 1);
      expect((first!['reads'] as List), hasLength(1));
      expect((first['reads'] as List).first['userUUID'], 'peer');
    });
  });

  group('chat join payload (emitter.chat.add)', () {
    test('stores the embedded reads of the joined chat messages', () async {
      await emitter.chat.add(
        {
          'uuid': 'chat-join',
          'type': 'GROUP',
          'name': 'Joined',
          'messages': [
            {
              'chatUUID': 'chat-join',
              'subID': 0,
              'id': 1,
              'senderUUID': 'me',
              'content': 'old message',
              'created_at': '2026-01-01T00:00:00Z',
              'reads': [
                {'userUUID': 'peer', 'readAt': '2026-01-01T01:00:00Z'},
              ],
            },
          ],
        },
        [
          {'uuid': 'me', 'name': 'Me'},
          {'uuid': 'peer', 'name': 'Peer'},
        ],
      );

      final message = await db.message.get.by.id('chat-join', 0, 1);
      expect(message, isNotNull);
      expect(message!['reads'], hasLength(1));
      expect((message['reads'] as List).first['userUUID'], 'peer');
    });
  });

  group('chat event cursor', () {
    test('never moves backwards', () async {
      await db.event.chat.update('chat-1', 100);
      await db.event.chat.update('chat-1', 40);

      expect(await cursor(), 100);
    });
  });
}
