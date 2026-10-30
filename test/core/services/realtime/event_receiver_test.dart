import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/services/realtime/event_receiver.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../../helpers/dispatch.dart';
import '../../../helpers/event_collector.dart';

/// Exercises every `EventReceiver` realtime handler end to end: a simulated
/// server publication goes in, the resulting emitter effects come out on the
/// `EventBus` (and the in-memory database).
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase db;
  late EventCollector bus;

  /// A catalog key whose scope is `synchronized`, so the handler accepts it.
  late String syncKey;

  /// A catalog key that exists but is device-local, so the handler rejects it.
  late String localKey;

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
    syncKey = SettingsCatalog.synchronizedKeys.first;
    localKey = SettingsCatalog.allItems
        .firstWhere(
          (i) => i.settingKey != null && i.scope != SettingScope.synchronized,
        )
        .settingKey!;
  });

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();
    await db.chat.add({'uuid': 'chat-1', 'type': 'GROUP', 'name': 'Chat 1'});
    bus = EventCollector.start();

    EventReceiver.instance
      ..identify(userUUID: null)
      ..initialize(GlobalEventEmitter(EventBus.instance, db));
  });

  tearDown(() async {
    EventReceiver.instance.identify(userUUID: null);
    await bus.stop();
    await db.close();
  });

  group('initialize', () {
    test('binds the emitter exactly once for the same instance', () async {
      EventReceiver.instance.initialize(
        GlobalEventEmitter(EventBus.instance, db),
      );

      dispatchEvent('user:presence:online', {'userUUID': 'u1'});
      await bus.settle();

      expect(bus.ofType<UserPresenceUpdateEvent>(), hasLength(1));
    });
  });

  group('publications', () {
    const message = {
      'id': 1,
      'chatUUID': 'chat-1',
      'subID': 0,
      'content': 'hello',
      'userUUID': 'u1',
    };

    test('unwraps the {event, payload} envelope of the channel data', () async {
      dispatchPublication('chat:1', {
        'event': 'message:new',
        'payload': message,
      });
      await bus.settle();

      expect(bus.single<MessageNewEvent>().message['content'], 'hello');
    });

    test('routes by event regardless of the channel', () async {
      dispatchPublication('user:u1', {
        'event': 'message:new',
        'payload': {
          ...message,
          'id': 2,
          'content': 'from the inbox',
        },
      });
      await bus.settle();

      expect(bus.single<MessageNewEvent>().message['content'],
          'from the inbox');
    });

    test('drops undecodable publication data', () async {
      dispatchRawPublication('chat:1', <int>[0x00, 0xFF, 0xFE, 0x80]);
      await bus.settle();

      expect(bus.ofType<MessageNewEvent>(), isEmpty);
    });

    test('drops a non-map envelope', () async {
      dispatchRawPublication('chat:1', utf8.encode(jsonEncode([1, 2])));
      await bus.settle();

      expect(bus.ofType<MessageNewEvent>(), isEmpty);
    });

    test('drops data without an event name', () async {
      dispatchPublication('chat:1', {'payload': message});
      await bus.settle();

      expect(bus.ofType<MessageNewEvent>(), isEmpty);
    });

    test('drops an empty event name', () async {
      dispatchPublication('chat:1', {'event': '', 'payload': message});
      await bus.settle();

      expect(bus.ofType<MessageNewEvent>(), isEmpty);
    });
  });

  group('user:profile:update', () {
    test('emits a profile update for the user', () async {
      dispatchEvent('user:profile:update', {
        'userUUID': 'u1',
        'name': 'Ada',
        'profileEventID': 12,
      });
      await bus.settle();

      final event = bus.single<UserProfileUpdateEvent>();
      expect(event.userUUID, 'u1');
      expect(event.data['name'], 'Ada');
    });

    test('persists the changed fields', () async {
      await db.user.add({'uuid': 'u1', 'name': 'Old'});

      dispatchEvent('user:profile:update', {
        'userUUID': 'u1',
        'name': 'Ada',
        'biography': 'Mathematician',
      });
      await bus.settle();

      final user = await db.user.get.byUUID('u1');
      expect(user?['name'], 'Ada');
      expect(user?['biography'], 'Mathematician');
    });

    test('ignores a non-map payload', () async {
      dispatchEvent('user:profile:update', 'not-a-map');
      await bus.settle();

      expect(bus.ofType<UserProfileUpdateEvent>(), isEmpty);
    });

    test('ignores a payload without a userUUID', () async {
      dispatchEvent('user:profile:update', {'name': 'Ada'});
      await bus.settle();

      expect(bus.ofType<UserProfileUpdateEvent>(), isEmpty);
    });
  });

  group('user:setting:chat:update', () {
    test('emits a chat setting update', () async {
      dispatchEvent('user:setting:chat:update', {
        'chatUUID': 'chat-1',
        'action': 'pin_add',
        'position': 0,
        'userEventID': 3,
      });
      await bus.settle();

      final event = bus.single<UserSettingChatUpdateEvent>();
      expect(event.chatUUID, 'chat-1');
      expect(event.action, 'pin_add');
    });

    test('pins the chat in the database for pin_add', () async {
      dispatchEvent('user:setting:chat:update', {
        'chatUUID': 'chat-1',
        'action': 'pin_add',
        'position': 1,
      });
      await bus.settle();

      final pinned = await db.chat.pin.get();
      expect(pinned.any((c) => c['chatUUID'] == 'chat-1'), isTrue);
    });

    test('unpins the chat in the database for pin_remove', () async {
      await db.chat.pin.add('chat-1', 0);

      dispatchEvent('user:setting:chat:update', {
        'chatUUID': 'chat-1',
        'action': 'pin_remove',
      });
      await bus.settle();

      final pinned = await db.chat.pin.get();
      expect(pinned.any((c) => c['chatUUID'] == 'chat-1'), isFalse);
    });

    test('ignores a payload missing the chatUUID', () async {
      dispatchEvent('user:setting:chat:update', {'action': 'pin_add'});
      await bus.settle();

      expect(bus.ofType<UserSettingChatUpdateEvent>(), isEmpty);
    });

    test('ignores a payload missing the action', () async {
      dispatchEvent('user:setting:chat:update', {'chatUUID': 'chat-1'});
      await bus.settle();

      expect(bus.ofType<UserSettingChatUpdateEvent>(), isEmpty);
    });
  });

  group('user:setting:update', () {
    test('applies a synchronized setting', () async {
      dispatchEvent('user:setting:update', {'key': syncKey, 'value': 'dark'});
      await bus.settle();

      final event = bus.single<SettingValueUpdateEvent>();
      expect(event.key, syncKey);
      expect(event.value, 'dark');
    });

    test('persists the setting with the synchronized scope', () async {
      dispatchEvent('user:setting:update', {'key': syncKey, 'value': 'light'});
      await bus.settle();

      expect(
        await db.settings.getAllSettings(),
        containsPair(syncKey, 'light'),
      );
    });

    test('ignores an unknown key', () async {
      dispatchEvent('user:setting:update', {
        'key': 'definitely_not_a_setting',
        'value': 1,
      });
      await bus.settle();

      expect(bus.ofType<SettingValueUpdateEvent>(), isEmpty);
    });

    test('ignores a device-local setting', () async {
      dispatchEvent('user:setting:update', {'key': localKey, 'value': 1});
      await bus.settle();

      expect(bus.ofType<SettingValueUpdateEvent>(), isEmpty);
    });

    test('ignores an empty key', () async {
      dispatchEvent('user:setting:update', {'key': '', 'value': 1});
      dispatchEvent('user:setting:update', {'value': 1});
      await bus.settle();

      expect(bus.ofType<SettingValueUpdateEvent>(), isEmpty);
    });
  });

  group('user:message:favorite:update', () {
    test('emits a favorite update for favorite_add', () async {
      dispatchEvent('user:message:favorite:update', {
        'chatUUID': 'chat-1',
        'subID': 0,
        'messageID': '11',
        'action': 'favorite_add',
        'userEventID': 4,
      });
      await bus.settle();

      final event = bus.single<FavoriteMessageUpdateEvent>();
      expect(event.chatUUID, 'chat-1');
      expect(event.subID, 0);
      expect(event.messageID, '11');
      expect(event.action, 'favorite_add');
    });

    test(
      'also emits a generic message update so the chatlist refreshes',
      () async {
        dispatchEvent('user:message:favorite:update', {
          'chatUUID': 'chat-1',
          'subID': 0,
          'messageID': '11',
          'action': 'favorite_add',
        });
        await bus.settle();

        expect(bus.single<MessageUpdateEvent>().action, 'favorite_add');
      },
    );

    test('emits a favorite update for favorite_remove', () async {
      dispatchEvent('user:message:favorite:update', {
        'chatUUID': 'chat-1',
        'subID': 1,
        'messageID': '12',
        'action': 'favorite_remove',
      });
      await bus.settle();

      final event = bus.single<FavoriteMessageUpdateEvent>();
      expect(event.action, 'favorite_remove');
      expect(event.subID, 1);
    });

    test('ignores an unknown action', () async {
      dispatchEvent('user:message:favorite:update', {
        'chatUUID': 'chat-1',
        'subID': 0,
        'messageID': '11',
        'action': 'teleport',
      });
      await bus.settle();

      expect(bus.ofType<FavoriteMessageUpdateEvent>(), isEmpty);
      expect(bus.ofType<MessageUpdateEvent>(), isEmpty);
    });

    test('ignores a payload missing any required identifier', () async {
      final complete = {
        'chatUUID': 'chat-1',
        'subID': 0,
        'messageID': '11',
        'action': 'favorite_add',
      };
      for (final missing in complete.keys) {
        dispatchEvent('user:message:favorite:update', {
          for (final e in complete.entries)
            if (e.key != missing) e.key: e.value,
        });
      }
      await bus.settle();

      expect(bus.ofType<FavoriteMessageUpdateEvent>(), isEmpty);
    });
  });

  group('user:presence', () {
    test('online marks the user ONLINE', () async {
      dispatchEvent('user:presence:online', {'userUUID': 'u1'});
      await bus.settle();

      final event = bus.single<UserPresenceUpdateEvent>();
      expect(event.status, 'ONLINE');
      expect(event.lastAccessAt, isNull);
    });

    test('offline carries the last access timestamp', () async {
      dispatchEvent('user:presence:offline', {
        'userUUID': 'u1',
        'lastAccessAt': '2026-01-01T10:00:00Z',
      });
      await bus.settle();

      final event = bus.single<UserPresenceUpdateEvent>();
      expect(event.status, 'OFFLINE');
      expect(event.lastAccessAt, '2026-01-01T10:00:00Z');
    });

    test('ignores a presence update without a userUUID', () async {
      dispatchEvent('user:presence:online', <String, dynamic>{});
      dispatchEvent('user:presence:offline', <String, dynamic>{});
      await bus.settle();

      expect(bus.ofType<UserPresenceUpdateEvent>(), isEmpty);
    });

    test('ignores the own presence update', () async {
      EventReceiver.instance.identify(userUUID: 'me');

      dispatchEvent('user:presence:online', {'userUUID': 'me'});
      dispatchEvent('user:presence:offline', {'userUUID': 'me'});
      await bus.settle();

      expect(bus.ofType<UserPresenceUpdateEvent>(), isEmpty);
    });
  });

  group('message:new', () {
    test('emits a new message event and stores the row', () async {
      dispatchEvent('message:new', {
        'id': 1,
        'chatUUID': 'chat-1',
        'subID': 0,
        'content': 'hello',
        'userUUID': 'u1',
      });
      await bus.settle();

      expect(bus.single<MessageNewEvent>().message['content'], 'hello');
      final stored = await db.message.get.by.id('chat-1', 0, 1);
      expect(stored?['content'], 'hello');
    });

    test('coerces a string subID', () async {
      dispatchEvent('message:new', {
        'id': 2,
        'chatUUID': 'chat-1',
        'subID': '3',
        'content': 'in a sub',
        'userUUID': 'u1',
      });
      await bus.settle();

      final stored = await db.message.get.by.id('chat-1', 3, 2);
      expect(stored?['content'], 'in a sub');
    });

    test('ignores a non-map payload', () async {
      dispatchEvent('message:new', 42);
      await bus.settle();

      expect(bus.ofType<MessageNewEvent>(), isEmpty);
    });
  });

  group('message:read', () {
    test('emits a read update with a synthesized payload', () async {
      dispatchEvent('message:read', {
        'chatUUID': 'chat-1',
        'subID': 0,
        'messageID': '1',
        'chatEventID': 5,
        'userUUID': 'u2',
        'readAt': '2026-01-01T00:00:00Z',
      });
      await bus.settle();

      final event = bus.single<MessageUpdateEvent>();
      expect(event.action, 'read');
      expect(event.data, {'userUUID': 'u2', 'readAt': '2026-01-01T00:00:00Z'});
    });

    test('ignores a payload missing an identifier', () async {
      dispatchEvent('message:read', {'chatUUID': 'chat-1', 'subID': 0});
      await bus.settle();

      expect(bus.ofType<MessageUpdateEvent>(), isEmpty);
    });
  });

  group('message:update', () {
    test('forwards the action and the raw payload', () async {
      dispatchEvent('message:update', {
        'chatUUID': 'chat-1',
        'subID': 0,
        'messageID': '1',
        'action': 'edit',
        'chatEventID': 6,
        'content': 'edited',
      });
      await bus.settle();

      final event = bus.single<MessageUpdateEvent>();
      expect(event.action, 'edit');
      expect(event.data['content'], 'edited');
    });

    test('applies a delete to the database', () async {
      await db.message.add({
        'id': 7,
        'chatUUID': 'chat-1',
        'subID': 0,
        'content': 'doomed',
      });

      dispatchEvent('message:update', {
        'chatUUID': 'chat-1',
        'subID': 0,
        'messageID': '7',
        'action': 'delete',
      });
      await bus.settle();

      expect(await db.message.get.by.id('chat-1', 0, 7), isNull);
    });

    test('ignores a payload missing the action', () async {
      dispatchEvent('message:update', {
        'chatUUID': 'chat-1',
        'subID': 0,
        'messageID': '1',
      });
      await bus.settle();

      expect(bus.ofType<MessageUpdateEvent>(), isEmpty);
    });
  });

  group('chat:new', () {
    test('emits a chat event and stores the chat and users', () async {
      dispatchEvent('chat:new', {
        'chat': {'uuid': 'chat-2', 'type': 'GROUP', 'name': 'New'},
        'users': [
          {'uuid': 'u9', 'name': 'Nine'},
        ],
      });
      await bus.settle();

      final event = bus.single<ChatNewEvent>();
      expect(event.chat['uuid'], 'chat-2');
      expect(event.users, hasLength(1));
      expect(
        (await db.chat.get.all()).any((c) => c['uuid'] == 'chat-2'),
        isTrue,
      );
    });

    test('rejects a payload whose chat is not a map', () async {
      dispatchEvent('chat:new', {'chat': 'not-a-map', 'users': <dynamic>[]});
      await bus.settle();

      expect(bus.ofType<ChatNewEvent>(), isEmpty);
    });

    test('rejects a payload whose users is not a list', () async {
      dispatchEvent('chat:new', {
        'chat': {'uuid': 'chat-2'},
        'users': 'not-a-list',
      });
      await bus.settle();

      expect(bus.ofType<ChatNewEvent>(), isEmpty);
    });
  });

  group('chat:update', () {
    test('emits a chat update', () async {
      dispatchEvent('chat:update', {
        'chatUUID': 'chat-1',
        'action': 'rename',
        'chatEventID': 7,
        'name': 'Renamed',
      });
      await bus.settle();

      final event = bus.single<ChatUpdateEvent>();
      expect(event.chatUUID, 'chat-1');
      expect(event.action, 'rename');
    });

    test('processes distinct chat event IDs separately', () async {
      dispatchEvent('chat:update', {
        'chatUUID': 'chat-1',
        'action': 'rename',
        'chatEventID': 9,
        'name': 'First',
      });
      dispatchEvent('chat:update', {
        'chatUUID': 'chat-1',
        'action': 'picture',
        'chatEventID': 10,
        'profilePictureUUID': 'p1',
      });
      await bus.settle();

      expect(bus.ofType<ChatUpdateEvent>(), hasLength(2));
    });

    test('forwards a nested sub payload for sub_create', () async {
      dispatchEvent('chat:update', {
        'chatUUID': 'chat-1',
        'action': 'sub_create',
        'sub': {'id': 1, 'name': 'General', 'type': 'TEXT'},
      });
      await bus.settle();

      expect(bus.single<ChatUpdateEvent>().data['sub'], {
        'id': 1,
        'name': 'General',
        'type': 'TEXT',
      });
    });

    test('removes a sub-channel for sub_delete', () async {
      await db.chat.sub.add('chat-1', {'id': 2, 'name': 'Temp'});

      dispatchEvent('chat:update', {
        'chatUUID': 'chat-1',
        'action': 'sub_delete',
        'subID': 2,
      });
      await bus.settle();

      expect(bus.single<ChatUpdateEvent>().action, 'sub_delete');
    });

    test('ignores a payload missing the action', () async {
      dispatchEvent('chat:update', {'chatUUID': 'chat-1'});
      await bus.settle();

      expect(bus.ofType<ChatUpdateEvent>(), isEmpty);
    });
  });

  group('chat:member', () {
    test('joined adds the member and emits the event', () async {
      dispatchEvent('chat:member:joined', {
        'chat': {'uuid': 'chat-1'},
        'user': {'uuid': 'u3', 'name': 'Three'},
        'chatEventID': 8,
      });
      await bus.settle();

      final event = bus.single<ChatMemberJoinedEvent>();
      expect(event.chatUUID, 'chat-1');
      expect(event.user['name'], 'Three');
      expect(await db.user.get.byUUID('u3'), isNotNull);
    });

    test('joined ignores a chat without a uuid', () async {
      dispatchEvent('chat:member:joined', {
        'chat': <String, dynamic>{'type': 'GROUP'},
        'user': {'uuid': 'u3'},
      });
      await bus.settle();

      expect(bus.ofType<ChatMemberJoinedEvent>(), isEmpty);
    });

    test('left removes the member and emits the event', () async {
      await db.chat.member.add('chat-1', {'uuid': 'u4', 'name': 'Four'});

      dispatchEvent('chat:member:left', {
        'chatUUID': 'chat-1',
        'user': {'uuid': 'u4'},
      });
      await bus.settle();

      expect(bus.single<ChatMemberLeftEvent>().chatUUID, 'chat-1');
      final members = await db.chat.member.get.by.chatUUID('chat-1');
      expect(members.any((m) => m['uuid'] == 'u4'), isFalse);
    });

    test('left ignores a payload whose user is not a map', () async {
      dispatchEvent('chat:member:left', {
        'chatUUID': 'chat-1',
        'user': 'nope',
      });
      await bus.settle();

      expect(bus.ofType<ChatMemberLeftEvent>(), isEmpty);
    });

    test('activity is forwarded verbatim', () async {
      dispatchEvent('chat:member:activity', {
        'chatUUID': 'chat-1',
        'userUUID': 'u5',
        'action': 'TYPING',
      });
      await bus.settle();

      final event = bus.single<ChatMemberActivityEvent>();
      expect(event.userUUID, 'u5');
      expect(event.action, 'TYPING');
    });

    test('activity ignores the sender own echo', () async {
      EventReceiver.instance.identify(userUUID: 'me');

      dispatchEvent('chat:member:activity', {
        'chatUUID': 'chat-1',
        'userUUID': 'me',
        'action': 'TYPING',
      });
      await bus.settle();

      expect(bus.ofType<ChatMemberActivityEvent>(), isEmpty);
    });

    test('activity ignores a payload missing an identifier', () async {
      dispatchEvent('chat:member:activity', {
        'chatUUID': 'chat-1',
        'action': 'TYPING',
      });
      await bus.settle();

      expect(bus.ofType<ChatMemberActivityEvent>(), isEmpty);
    });
  });
}
