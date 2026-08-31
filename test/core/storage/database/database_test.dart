import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/storage/database/database.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  late AppDatabase db;
  late EventBus eventBus;
  late GlobalEventEmitter emitter;

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();
    eventBus = EventBus.instance;
    emitter = GlobalEventEmitter.instance;
  });

  tearDown(() async {
    await db.close();
  });

  group('AppDatabase & Schema Tests', () {
    test('initializes and verifies default tables and seed records', () async {
      expect(db.isOpen, isTrue);

      final tables = await db.rawDb!.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='table';",
      );
      final tableNames = tables.map((t) => t['name'] as String).toList();

      expect(tableNames, contains('chat_type'));
      expect(tableNames, contains('user'));
      expect(tableNames, contains('handle_type'));
      expect(tableNames, contains('chat'));
      expect(tableNames, contains('chat_sub'));
      expect(tableNames, contains('chat_pin'));
      expect(tableNames, contains('role'));
      expect(tableNames, contains('member'));
      expect(tableNames, contains('file'));
      expect(tableNames, contains('message'));
      expect(tableNames, contains('pinned_message'));
      expect(tableNames, contains('edited_message'));
      expect(tableNames, contains('deleted_message'));
      expect(tableNames, contains('reaction_message'));
      expect(tableNames, contains('message_files'));
      expect(tableNames, contains('message_reply'));
      expect(tableNames, contains('message_read'));
      expect(tableNames, contains('pending_message'));
      expect(tableNames, contains('pending_file'));
      expect(tableNames, contains('bot'));
      expect(tableNames, contains('handle'));
      expect(tableNames, contains('queue_job'));
      expect(tableNames, contains('pinned_chat'));

      // Check system user
      final systemUser = await db.user.get.byUUID(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(systemUser, isNotNull);
      expect(systemUser!['name'], 'System');
    });
  });

  group('UserRepository & ProfileRepository Tests', () {
    test('adds user, retrieves by UUID and by handle', () async {
      final success = await db.user.add({
        'uuid': 'user-1',
        'name': 'Alice',
        'surname': 'Wonderland',
        'handle': 'alice',
        'biography': 'Curiouser and curiouser',
        'region': 'EU',
        'country': 'IT',
      });
      expect(success, isTrue);

      final user = await db.user.get.byUUID('user-1');
      expect(user, isNotNull);
      expect(user!['name'], 'Alice');
      expect(user['handle'], 'alice');
      expect(user['biography'], 'Curiouser and curiouser');

      final userByHandle = await db.user.get.byHandle('alice');
      expect(userByHandle, isNotNull);
      expect(userByHandle!['uuid'], 'user-1');

      final handleVal = await db.handle.get.by.uuid('user', 'user-1');
      expect(handleVal, 'alice');
    });

    test('adds multiple users in batch', () async {
      final success = await db.user.addMultiple([
        {'uuid': 'user-2', 'name': 'Bob', 'handle': 'bob'},
        {'uuid': 'user-3', 'name': 'Charlie', 'handle': 'charlie'},
      ]);
      expect(success, isTrue);

      final allUsers = await db.user.get.all();
      expect(allUsers.any((u) => u['uuid'] == 'user-2'), isTrue);
      expect(allUsers.any((u) => u['uuid'] == 'user-3'), isTrue);
    });

    test('updates profile fields', () async {
      await db.user.add({'uuid': 'user-4', 'name': 'Dave', 'handle': 'dave'});

      await db.user.profile.name.update('user-4', 'David');
      await db.user.profile.surname.update('user-4', 'Smith');
      await db.user.profile.biography.update('user-4', 'Flutter dev');
      await db.user.profile.picture.update('user-4', 'pic-123');
      await db.user.profile.region.update('user-4', 'Lombardia');
      await db.user.profile.country.update('user-4', 'Italy');
      await db.user.profile.banner.update('user-4', 'banner-123');
      await db.user.profile.color.update('user-4', '#FF5733');

      final updated = await db.user.get.byUUID('user-4');
      expect(updated!['name'], 'David');
      expect(updated['surname'], 'Smith');
      expect(updated['biography'], 'Flutter dev');
      expect(updated['profilePictureUUID'], 'pic-123');
      expect(updated['region'], 'Lombardia');
      expect(updated['country'], 'Italy');
      expect(updated['bannerPictureUUID'], 'banner-123');
      expect(updated['color'], '#FF5733');

      final pic = await db.user.profile.picture.get('user-4');
      expect(pic, 'pic-123');
    });

    test('retrieves all event IDs for synchronization', () async {
      await db.user.add({
        'uuid': 'user-sync',
        'name': 'SyncUser',
        'handle': 'syncuser',
      });
      await db.event.user.profile.update('user-sync', 42);

      await db.chat.add({
        'uuid': 'chat-sync',
        'type': 'GROUP',
        'name': 'SyncChat',
        'members': ['user-sync'],
      });
      await db.event.chat.update('chat-sync', 99);

      final eventIDs = await db.user.update.getAllEventsIDs();
      expect(eventIDs['chats'], isNotEmpty);
      expect(eventIDs['users'], isNotEmpty);

      final chatSync = (eventIDs['chats'] as List).firstWhere(
        (c) => c['chatUUID'] == 'chat-sync',
      );
      expect(chatSync['eventID'], 99);

      final userSync = (eventIDs['users'] as List).firstWhere(
        (u) => u['userUUID'] == 'user-sync',
      );
      expect(userSync['profileEventID'], 42);
    });
  });

  group('FileRepository Tests', () {
    test('adds and retrieves file info and calculates totalSize', () async {
      await db.file.add(
        'file-1',
        'photo.jpg',
        'image/jpeg',
        2048,
        ref: 'local/path/photo.jpg',
      );
      await db.file.add(
        'file-2',
        'voice.mp3',
        'audio/mp3',
        4096,
        duration: 30,
        waveform: [0.1, 0.5, 0.9],
      );

      final ref = await db.file.get.ref('file-1');
      expect(ref, 'local/path/photo.jpg');

      final allInfo = await db.file.get.all('file-2');
      expect(allInfo!['name'], 'voice.mp3');
      expect(allInfo['duration'], 30);
      expect(allInfo['waveform'], [0.1, 0.5, 0.9]);

      final total = await db.file.get.totalSize();
      expect(total, 6144);

      await db.file.update.ref('file-1', 'new/ref.jpg');
      expect(await db.file.get.ref('file-1'), 'new/ref.jpg');
    });
  });

  group('ChatRepository & MemberRepository Tests', () {
    test('adds chat with members, roles, subs, pinned messages', () async {
      await db.user.add({'uuid': 'u1', 'name': 'User 1', 'handle': 'u1'});
      await db.user.add({'uuid': 'u2', 'name': 'User 2', 'handle': 'u2'});

      final success = await db.chat.add({
        'uuid': 'chat-1',
        'type': 'GROUP',
        'name': 'My Group',
        'handle': 'mygroup',
        'members': [
          {
            'uuid': 'u1',
            'roleIDs': [1],
          },
          {'uuid': 'u2', 'roleIDs': []},
        ],
        'roles': [
          {
            'id': 1,
            'name': 'Admin',
            'permission': 'ALL',
            'level': 100,
            'color': '#FF0000',
          },
        ],
        'subs': [
          {'id': 0, 'name': 'General', 'type': 'DEFAULT'},
        ],
      });
      expect(success, isTrue);

      final handle = await db.handle.get.by.uuid('chat', 'chat-1');
      expect(handle, 'mygroup');

      final members = await db.chat.member.get.by.chatUUID('chat-1');
      expect(members.length, 2);
      expect(members.any((m) => m['uuid'] == 'u1'), isTrue);

      // Pinned chat
      await db.chat.pin.add('chat-1', 1);
      final pinned = await db.chat.pin.get();
      expect(pinned.length, 1);
      expect(pinned.first['chatUUID'], 'chat-1');

      await db.chat.pin.remove('chat-1');
      expect(await db.chat.pin.get(), isEmpty);
    });

    test('chat sub channels operations', () async {
      await db.user.add({'uuid': 'u1', 'name': 'User 1', 'handle': 'u1'});
      await db.chat.add({
        'uuid': 'forum-1',
        'type': 'FORUM',
        'name': 'Forum',
        'members': ['u1'],
      });

      await db.chat.sub.add('forum-1', {
        'id': 10,
        'name': 'Dev',
        'type': 'CHANNEL',
      });
      await db.chat.sub.update('forum-1', 10, {'name': 'Flutter Dev'});

      final chats = await db.chat.get.all();
      final chat = chats.firstWhere((c) => c['uuid'] == 'forum-1');
      final subs = chat['subs'] as List;
      expect(
        subs.any((s) => s['id'] == 10 && s['name'] == 'Flutter Dev'),
        isTrue,
      );

      await db.chat.sub.remove('forum-1', 10);
      final updatedChats = await db.chat.get.all();
      final updatedChat = updatedChats.firstWhere(
        (c) => c['uuid'] == 'forum-1',
      );
      expect((updatedChat['subs'] as List).any((s) => s['id'] == 10), isFalse);
    });
  });

  group('MessageRepository Tests', () {
    test('adds message with replyTos, reactions, reads, files', () async {
      await db.user.add({
        'uuid': 'sender-1',
        'name': 'Sender',
        'handle': 'sender',
      });
      await db.user.add({
        'uuid': 'reader-1',
        'name': 'Reader',
        'handle': 'reader',
      });
      await db.chat.add({
        'uuid': 'msg-chat',
        'type': 'DM',
        'members': ['sender-1', 'reader-1'],
      });

      final success = await db.message.add({
        'id': 1,
        'chatUUID': 'msg-chat',
        'subID': 0,
        'senderUUID': 'sender-1',
        'content': 'Hello world!',
        'replyTos': [
          {
            'chatUUID': 'msg-chat',
            'subID': 0,
            'messageID': 0,
            'rangeStart': 0,
            'rangeEnd': 5,
          },
        ],
        'files': [
          {
            'uuid': 'file-m1',
            'name': 'doc.pdf',
            'mimeType': 'application/pdf',
            'size': 1024,
          },
        ],
        'reactions': [
          {'reaction': '👍', 'userUUID': 'reader-1'},
        ],
        'reads': [
          {'userUUID': 'reader-1', 'readAt': DateTime.now().toIso8601String()},
        ],
      });
      expect(success, isTrue);

      final msg = await db.message.get.by.id('msg-chat', 0, 1);
      expect(msg, isNotNull);
      expect(msg!['content'], 'Hello world!');
      expect(msg['sender_name'], 'Sender');
      expect((msg['replyTos'] as List).isNotEmpty, isTrue);
      expect((msg['files'] as List).isNotEmpty, isTrue);
      expect((msg['reactions'] as List).isNotEmpty, isTrue);
      expect((msg['readBy'] as List).isNotEmpty, isTrue);

      // Search
      final searchResults = await db.message.search(
        'world',
        chatUUID: 'msg-chat',
      );
      expect(searchResults.length, 1);
      expect(searchResults.first['id'], 1);

      // Edit
      await db.message.edit('msg-chat', 0, 1, 'Edited content');
      final editedMsg = await db.message.get.by.id('msg-chat', 0, 1);
      expect(editedMsg!['content'], 'Edited content');

      // Pin
      await db.message.pin.add(
        'msg-chat',
        0,
        1,
        DateTime.now().toIso8601String(),
        'reader-1',
      );
      final pins = await db.message.pin.get('msg-chat');
      expect(pins.length, 1);
      expect(pins.first['messageID'], 1);

      await db.message.pin.remove('msg-chat', 0, 1);
      expect(await db.message.pin.get('msg-chat'), isEmpty);

      // Delete
      await db.message.delete('msg-chat', 0, 1);
      final deletedMsg = await db.message.get.by.id('msg-chat', 0, 1);
      expect(deletedMsg, isNull);
    });

    test('calculates unreadCount accurately in chat.get.all', () async {
      await db.user.add({'uuid': 'alice', 'name': 'Alice', 'handle': 'alice'});
      await db.user.add({'uuid': 'bob', 'name': 'Bob', 'handle': 'bob'});
      await db.chat.add({
        'uuid': 'chat-unread',
        'type': 'DM',
        'members': [
          {'uuid': 'alice', 'joinedAt': '2026-01-01T00:00:00Z'},
          {'uuid': 'bob', 'joinedAt': '2026-01-01T00:00:00Z'},
        ],
      });

      await db.message.add({
        'id': 1,
        'chatUUID': 'chat-unread',
        'subID': 0,
        'senderUUID': 'alice',
        'content': 'Msg 1',
        'created_at': '2026-01-02T10:00:00Z',
      });
      await db.message.add({
        'id': 2,
        'chatUUID': 'chat-unread',
        'subID': 0,
        'senderUUID': 'alice',
        'content': 'Msg 2',
        'created_at': '2026-01-02T11:00:00Z',
      });

      // Bob hasn't read any messages
      final chatsForBob = await db.chat.get.all('bob');
      final chatForBob = chatsForBob.firstWhere(
        (c) => c['uuid'] == 'chat-unread',
      );
      expect(chatForBob['unreadCount'], 2);

      // Bob reads message 1
      await db.message.read.add(
        'chat-unread',
        0,
        1,
        'bob',
        '2026-01-02T10:30:00Z',
      );
      final updatedChatsForBob = await db.chat.get.all('bob');
      final updatedChatForBob = updatedChatsForBob.firstWhere(
        (c) => c['uuid'] == 'chat-unread',
      );
      expect(updatedChatForBob['unreadCount'], 1);
    });
  });

  group('GlobalEventEmitter Database Integration Tests', () {
    test(
      'emitter.message.add persists to DB and emits MessageNewEvent',
      () async {
        await db.user.add({
          'uuid': 'u-emitter',
          'name': 'UEmitter',
          'handle': 'uemitter',
        });
        await db.chat.add({
          'uuid': 'chat-emitter',
          'type': 'GROUP',
          'members': ['u-emitter'],
        });

        MessageNewEvent? receivedEvent;
        final sub = eventBus.on<MessageNewEvent>().listen(
          (e) => receivedEvent = e,
        );

        await emitter.message.add({
          'id': 100,
          'chatUUID': 'chat-emitter',
          'subID': 0,
          'senderUUID': 'u-emitter',
          'content': 'Emitted message',
        });

        await Future.delayed(const Duration(milliseconds: 10));
        expect(receivedEvent, isNotNull);
        expect(receivedEvent!.message['content'], 'Emitted message');

        final saved = await db.message.get.by.id('chat-emitter', 0, 100);
        expect(saved, isNotNull);
        expect(saved!['content'], 'Emitted message');

        await sub.cancel();
      },
    );

    test('emitter.chat.add persists chat, messages and users', () async {
      ChatNewEvent? receivedChatEvent;
      final sub = eventBus.on<ChatNewEvent>().listen(
        (e) => receivedChatEvent = e,
      );

      await emitter.chat.add(
        {
          'uuid': 'chat-new-emit',
          'type': 'GROUP',
          'name': 'New Group',
          'members': [
            {'uuid': 'user-e1'},
            {'uuid': 'user-e2'},
          ],
          'messages': [
            {
              'id': 1,
              'chatUUID': 'chat-new-emit',
              'subID': 0,
              'senderUUID': 'user-e1',
              'content': 'Welcome!',
            },
          ],
        },
        [
          {'uuid': 'user-e1', 'name': 'User E1', 'handle': 'usere1'},
          {'uuid': 'user-e2', 'name': 'User E2', 'handle': 'usere2'},
        ],
      );

      await Future.delayed(const Duration(milliseconds: 10));
      expect(receivedChatEvent, isNotNull);

      final user1 = await db.user.get.byUUID('user-e1');
      expect(user1, isNotNull);
      expect(user1!['name'], 'User E1');

      final msg = await db.message.get.by.id('chat-new-emit', 0, 1);
      expect(msg, isNotNull);
      expect(msg!['content'], 'Welcome!');

      await sub.cancel();
    });

    test('emitter.user.profile.update persists fields and emits UserProfileUpdateEvent', () async {
      await db.user.add({
        'uuid': 'u-prof',
        'name': 'Original',
        'handle': 'uprof',
      });

      UserProfileUpdateEvent? receivedEvent;
      final sub = eventBus.on<UserProfileUpdateEvent>().listen(
        (e) => receivedEvent = e,
      );

      await emitter.user.profile.update({
        'userUUID': 'u-prof',
        'name': 'UpdatedName',
        'biography': 'New bio',
      }, 555);

      await Future.delayed(const Duration(milliseconds: 10));
      expect(receivedEvent, isNotNull);
      expect(receivedEvent!.userUUID, 'u-prof');

      final user = await db.user.get.byUUID('u-prof');
      expect(user!['name'], 'UpdatedName');
      expect(user['biography'], 'New bio');
      expect(user['profileEventID'], 555);

      await sub.cancel();
    });
  });

  group('QueueJobRepository Tests', () {
    test(
      'saves, updates status/payload and retrieves pending queue jobs',
      () async {
        await db.chat.add({
          'uuid': 'chat-q1',
          'type': 'DM',
          'name': 'Queue Chat',
        });

        // 1. Save Job
        final saved = await db.job.save({
          'id': 'job-1',
          'chat_uuid': 'chat-q1',
          'sub_id': 0,
          'job_type': 'OUTGOING_MESSAGE',
          'priority': 50,
          'status': 'PENDING',
          'payload': {'content': 'Hello queue'},
        });
        expect(saved, isTrue);

        // 2. Retrieve Job
        final job = await db.job.get('job-1');
        expect(job, isNotNull);
        expect(job!['chat_uuid'], 'chat-q1');
        expect(job['priority'], 50);
        expect(job['payload'], {'content': 'Hello queue'});

        // 3. Update status & progress
        await db.job.updateStatus('job-1', 'PROCESSING', progress: 0.5);
        final updatedJob = await db.job.get('job-1');
        expect(updatedJob!['status'], 'PROCESSING');
        expect(updatedJob['progress'], 0.5);

        // 4. Update payload
        await db.job.updatePayload('job-1', {'content': 'Edited message'});
        final editedJob = await db.job.get('job-1');
        expect(editedJob!['payload'], {'content': 'Edited message'});

        // 5. Test resetProcessingToPending
        await db.job.resetProcessingToPending();
        final resetJob = await db.job.get('job-1');
        expect(resetJob!['status'], 'PENDING');

        // 6. Delete
        await db.job.delete('job-1');
        final deletedJob = await db.job.get('job-1');
        expect(deletedJob, isNull);
      },
    );
  });
}
