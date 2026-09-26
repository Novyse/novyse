import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/storage/database/database.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MessageFieldParser Tests', () {
    test('parses edited and pinned flags correctly across bools, ints, and strings', () {
      expect(MessageFieldParser.isEdited({'edited': true}), isTrue);
      expect(MessageFieldParser.isEdited({'edited': 1}), isTrue);
      expect(MessageFieldParser.isEdited({'edited': 'true'}), isTrue);
      expect(MessageFieldParser.isEdited({'edited': '1'}), isTrue);
      expect(MessageFieldParser.isEdited({'edited': false}), isFalse);
      expect(MessageFieldParser.isEdited({'edited': 0}), isFalse);
      expect(MessageFieldParser.isEdited({}), isFalse);

      expect(MessageFieldParser.isPinned({'pinned': true}), isTrue);
      expect(MessageFieldParser.isPinned({'pinned': 1}), isTrue);
      expect(MessageFieldParser.isPinned({'pinned': 'true'}), isTrue);
      expect(MessageFieldParser.isPinned({'pinned': '1'}), isTrue);
      expect(MessageFieldParser.isPinned({'pinned': false}), isFalse);
      expect(MessageFieldParser.isPinned({'pinned': 0}), isFalse);
      expect(MessageFieldParser.isPinned({}), isFalse);
    });

    test('parses senderUUID with fallback to userUUID and sender_uuid', () {
      expect(
        MessageFieldParser.parseSenderUUID({'senderUUID': 'uuid-1'}),
        'uuid-1',
      );
      expect(
        MessageFieldParser.parseSenderUUID({'userUUID': 'uuid-2'}),
        'uuid-2',
      );
      expect(
        MessageFieldParser.parseSenderUUID({'sender_uuid': 'uuid-3'}),
        'uuid-3',
      );
      expect(
        MessageFieldParser.parseSenderUUID({
          'userUUID': 'priority-user',
          'sender_uuid': 'fallback-uuid',
        }),
        'priority-user',
      );
      expect(MessageFieldParser.parseSenderUUID({}), isNull);
    });

    test('parses subID safely from int, num, string, and null', () {
      expect(MessageFieldParser.parseSubID(0), 0);
      expect(MessageFieldParser.parseSubID(42), 42);
      expect(MessageFieldParser.parseSubID(42.8), 42);
      expect(MessageFieldParser.parseSubID('99'), 99);
      expect(MessageFieldParser.parseSubID('invalid'), 0);
      expect(MessageFieldParser.parseSubID(null), 0);
    });

    test('parses ID safely from int, num, string, and null', () {
      expect(MessageFieldParser.parseId(101), 101);
      expect(MessageFieldParser.parseId(101.5), 101);
      expect(MessageFieldParser.parseId('202'), 202);
      expect(MessageFieldParser.parseId(null), 0);
      expect(MessageFieldParser.parseId('not-a-number'), 0);
    });

    test('parses reads on the exact userUUID key', () {
      final reads = MessageFieldParser.parseMapList([
        {'userUUID': 'u1', 'readAt': '2026-09-01T10:00:00.000Z'},
        {'userUUID': '', 'readAt': '2026-09-01T10:00:00.000Z'},
      ]);
      expect(reads, hasLength(2));
      expect(reads.first['userUUID'], 'u1');
    });
  });

  group('MessageRepository Field Normalization Integration Tests', () {
    late AppDatabase db;

    setUpAll(() async {
      db = AppDatabase.instance;
      await db.initialize(inMemory: true);
    });

    setUp(() async {
      await db.clear();
      await db.user.add({'uuid': 'u1', 'name': 'User 1', 'handle': 'u1'});
      await db.user.add({'uuid': 'u2', 'name': 'User 2', 'handle': 'u2'});
      await db.chat.add({
        'uuid': 'c1',
        'type': 'DM',
        'members': ['u1'],
      });
    });

    test('handles edited: 1 and pinned: 1 with userUUID in add()', () async {
      final ok = await db.message.add({
        'id': 10,
        'chatUUID': 'c1',
        'subID': '0',
        'userUUID': 'u1',
        'content': 'Test int flags',
        'edited': 1,
        'pinned': 1,
      });
      expect(ok, isTrue);

      final loaded = await db.message.get.by.id('c1', 0, 10);
      expect(loaded, isNotNull);
      expect(loaded!['edited'], isTrue);
      expect(loaded['pinned'], isTrue);
      expect(loaded['senderUUID'], 'u1');
    });

    test('bulk inserts message and edited flag', () async {
      final ok = await db.message.addMultiple([
        {
          'id': 20,
          'chatUUID': 'c1',
          'subID': 0,
          'senderUUID': 'u1',
          'content': 'Batch msg 1',
          'created_at': '2026-09-24T10:00:00.000Z',
          'type': 'message',
          'edited': 1,
        },
      ]);
      expect(ok, isTrue);

      final loaded = await db.message.get.by.id('c1', 0, 20);
      expect(loaded, isNotNull);
      expect(loaded!['edited'], isTrue);
      expect(loaded['created_at'], '2026-09-24T10:00:00.000Z');
    });

    test('stores exact read receipt on the message returned by init', () async {
      final ok = await db.message.addMultiple([
        {
          'id': 30,
          'chatUUID': 'c1',
          'subID': 0,
          'senderUUID': 'u2',
          'content': 'Earlier',
          'created_at': '2026-09-24T10:00:00.000Z',
          'type': 'message',
        },
        {
          'id': 31,
          'chatUUID': 'c1',
          'subID': 0,
          'senderUUID': 'u2',
          'content': 'Read watermark',
          'created_at': '2026-09-24T10:01:00.000Z',
          'type': 'message',
          'reads': [
            {'userUUID': 'u1', 'readAt': '2026-09-01T10:00:00.000Z'},
          ],
        },
        {
          'id': 32,
          'chatUUID': 'c1',
          'subID': 0,
          'senderUUID': 'u2',
          'content': 'After watermark',
          'created_at': '2026-09-24T10:02:00.000Z',
          'type': 'message',
        },
      ]);

      expect(ok, isTrue);
      final earlier = await db.message.get.by.id('c1', 0, 30);
      final watermark = await db.message.get.by.id('c1', 0, 31);
      final after = await db.message.get.by.id('c1', 0, 32);
      expect(earlier!['reads'], hasLength(1));
      expect(earlier['reads'].single['userUUID'], 'u1');
      expect(watermark!['reads'], hasLength(1));
      expect(watermark['reads'].single['userUUID'], 'u1');
      expect(after!['reads'], isEmpty);
    });

    test('ignores blank reads on the exact userUUID key', () async {
      final ok = await db.message.addMultiple([
        {
          'id': 40,
          'chatUUID': 'c1',
          'subID': 0,
          'senderUUID': 'u1',
          'content': 'Mine',
          'created_at': '2026-09-24T10:00:00.000Z',
          'type': 'message',
          'reads': [
            {'userUUID': '', 'readAt': '2026-09-01T10:00:00.000Z'},
            {'userUUID': 'u2', 'readAt': '2026-09-01T10:00:00.000Z'},
          ],
        },
      ]);
      expect(ok, isTrue);
      final loaded = await db.message.get.by.id('c1', 0, 40);
      expect(loaded, isNotNull);
      // Blank entries are excluded; only u2 remains.
      expect(loaded!['reads'], hasLength(1));
      expect(loaded['reads'].single['userUUID'], 'u2');
    });

    test('reports unread anchor in one round trip', () async {
      final ok = await db.message.addMultiple([
        for (final id in [50, 51, 52])
          {
            'id': id,
            'chatUUID': 'c1',
            'subID': 0,
            'senderUUID': 'u2',
            'content': 'msg $id',
            'created_at': '2026-09-24T10:00:00.000Z',
            'type': 'message',
            if (id == 51)
              'reads': [
                {'userUUID': 'u1', 'readAt': '2026-09-01T10:00:00.000Z'},
              ],
          },
      ]);
      expect(ok, isTrue);

      // Watermark at 51: first unread is 52.
      final anchor = await db.message.read.getUnreadAnchor('c1', 0, 'u1');
      expect(anchor.watermark, 51);
      expect(anchor.firstUnreadId, 52);
      // Sender with nothing incoming, and unknown chats, report zeros.
      final empty = await db.message.read.getUnreadAnchor('c1', 0, 'u2');
      expect(empty, (firstUnreadId: 0, watermark: 0));
      final missing = await db.message.read.getUnreadAnchor('cX', 0, 'u1');
      expect(missing, (firstUnreadId: 0, watermark: 0));
    });

    test('counts unreads against the per-sub watermark', () async {
      await db.chat.add({
        'uuid': 'cf',
        'type': 'FORUM',
        'members': [
          {'uuid': 'u1', 'joined_at': '2020-01-01T00:00:00.000Z'},
          {'uuid': 'u2', 'joined_at': '2020-01-01T00:00:00.000Z'},
        ],
      });
      final ok = await db.message.addMultiple([
        for (final sub in [0, 1])
          for (final id in [10, 11])
            {
              'id': id,
              'chatUUID': 'cf',
              'subID': sub,
              'senderUUID': 'u2',
              'content': 's$sub m$id',
              'created_at': '2026-09-24T10:00:00.000Z',
              'type': 'message',
              if (sub == 0 && id == 11)
                'reads': [
                  {'userUUID': 'u1', 'readAt': '2026-09-01T10:00:00.000Z'},
                ],
              if (sub == 1 && id == 10)
                'reads': [
                  {'userUUID': 'u1', 'readAt': '2026-09-01T10:00:00.000Z'},
                ],
            },
      ]);
      expect(ok, isTrue);

      // sub 0 fully read (watermark 11), sub 1 unread at 11: without the
      // per-sub correlation the sub 0 watermark would hide sub 1's unread.
      final chats = await db.chat.get.all('u1');
      final forum = chats.firstWhere((c) => c['uuid'] == 'cf');
      expect(forum['unreadCount'], 1);
    });
  });
}
