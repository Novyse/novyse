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
      await db.chat.add({'uuid': 'c1', 'type': 'DM', 'members': ['u1']});
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

    test('handles edited: 1 and pinned: 1 with userUUID in addMultiple()', () async {
      final ok = await db.message.addMultiple([
        {
          'id': 20,
          'chatUUID': 'c1',
          'subID': 0,
          'sender_uuid': 'u1',
          'content': 'Batch msg 1',
          'edited': 1,
          'pinned': 1,
        },
      ]);
      expect(ok, isTrue);

      final loaded = await db.message.get.by.id('c1', 0, 20);
      expect(loaded, isNotNull);
      expect(loaded!['edited'], isTrue);
      expect(loaded['pinned'], isTrue);
    });
  });
}
