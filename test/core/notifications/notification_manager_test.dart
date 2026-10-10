import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/config/global.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/notifications/local_notification_service.dart';
import 'package:novyse/core/notifications/notification_manager.dart';

import '../../helpers/fake_notifications.dart';

/// `NotificationManager.displayFromRemoteData` is a pure decision pipeline: a
/// remote payload plus the injected hooks decide whether — and with what
/// title/body — a notification is shown. These tests pin every early return
/// and the final projection.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeNotifications notifications;
  late NotificationManager manager;
  final l10n = lookupAppL10n();

  /// Chats the hooks resolve, keyed by uuid.
  final chats = <String, Map<String, dynamic>>{};

  /// Users the hooks resolve, keyed by uuid.
  final users = <String, Map<String, dynamic>>{};

  setUp(() async {
    notifications = FakeNotifications.install();
    await LocalNotificationService.instance.clearAll();
    notifications.clearRecords();

    chats.clear();
    users.clear();

    manager = NotificationManager.instance;
    manager.isChatMuted = null;
    manager.activeChatUUID = () => null;
    manager.localUserUUID = () => 'me';
    manager.getChat = (uuid) => chats[uuid];
    manager.getUser = (uuid) => users[uuid];
    manager.isChatMuted = (_) => false;
    manager.setLifecycle(AppLifecycleState.paused);
    await manager.reset();
    notifications.clearRecords();
  });

  tearDown(() async {
    manager.isChatMuted = null;
    manager.activeChatUUID = null;
    manager.localUserUUID = null;
    manager.getChat = null;
    manager.getUser = null;
    manager.setLifecycle(AppLifecycleState.resumed);
  });

  /// A minimal remote message payload.
  Map<String, dynamic> payload({
    String chatUUID = 'chat-1',
    String senderUUID = 'u1',
    String? content = 'hello',
    String? id = 'm1',
  }) => {
    'chatUUID': chatUUID,
    'senderUUID': senderUUID,
    'content': content,
    'messageId': ?id,
  };

  group('early returns', () {
    test('drops a payload with no chatUUID', () async {
      await manager.displayFromRemoteData({
        'content': 'orphan',
      }, source: NotificationSource.socket);

      expect(notifications.showCount, 0);
    });

    test('falls back to the chatUUID nested in the message', () async {
      await manager.displayFromRemoteData({
        'message': {'chatUUID': 'chat-9', 'id': 'm9', 'content': 'nested'},
      }, source: NotificationSource.socket);

      expect(notifications.last.payload, contains('"chatUUID":"chat-9"'));
    });

    test('drops a muted chat', () async {
      manager.isChatMuted = (uuid) => uuid == 'chat-1';

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 0);
    });

    test('keeps a chat that is not muted', () async {
      manager.isChatMuted = (uuid) => uuid == 'other-chat';

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 1);
    });

    test('drops an echo of the local user own message', () async {
      await manager.displayFromRemoteData(
        payload(senderUUID: 'me'),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 0);
    });

    test('keeps a message from a different user', () async {
      await manager.displayFromRemoteData(
        payload(senderUUID: 'someone-else'),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 1);
    });

    test('keeps a message with an empty sender when nobody is local', () async {
      manager.localUserUUID = () => null;

      await manager.displayFromRemoteData(
        payload(senderUUID: ''),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 1);
    });

    test('drops a socket message for the chat already on screen', () async {
      manager.setLifecycle(AppLifecycleState.resumed);
      manager.activeChatUUID = () => 'chat-1';

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 0);
    });

    test('keeps a message for a different chat while active', () async {
      manager.setLifecycle(AppLifecycleState.resumed);
      manager.activeChatUUID = () => 'chat-2';

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 1);
    });

    test('shows it anyway when the app is in the background', () async {
      manager.setLifecycle(AppLifecycleState.paused);
      manager.activeChatUUID = () => 'chat-1';

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 1);
    });

    test('shows the active chat when force is set', () async {
      manager.setLifecycle(AppLifecycleState.resumed);
      manager.activeChatUUID = () => 'chat-1';

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
        force: true,
      );

      expect(notifications.showCount, 1);
    });

    test('treats inactive as not active', () async {
      manager.setLifecycle(AppLifecycleState.inactive);
      manager.activeChatUUID = () => 'chat-1';

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 0);
    });
  });

  group('deduplication', () {
    test('shows a repeated message id only once', () async {
      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );
      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 1);
    });

    test('shows distinct message ids', () async {
      await manager.displayFromRemoteData(
        payload(id: 'm1'),
        source: NotificationSource.socket,
      );
      await manager.displayFromRemoteData(
        payload(id: 'm2'),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 2);
    });

    test('always shows a payload with no id', () async {
      await manager.displayFromRemoteData(
        payload(id: null),
        source: NotificationSource.socket,
      );
      await manager.displayFromRemoteData(
        payload(id: null),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 2);
    });

    test('forgets ids after a reset', () async {
      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );
      await manager.reset();
      notifications.clearRecords();

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 1);
    });

    test('prefers the id nested in the message over the outer one', () async {
      final data = {
        'message': {'chatUUID': 'chat-1', 'id': 'nested-id', 'content': 'hi'},
        'messageId': 'outer-id',
      };

      await manager.displayFromRemoteData(
        data,
        source: NotificationSource.socket,
      );
      await manager.displayFromRemoteData(
        data,
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 1);
      expect(
        jsonDecode(notifications.last.payload!),
        containsPair('messageId', 'nested-id'),
      );
    });
  });

  group('title and body projection', () {
    test('titles a DM with the sender name', () async {
      users['u1'] = {'name': 'Ada'};

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.last.title, 'Ada');
      expect(notifications.last.body, 'hello');
    });

    test('falls back to the unknown-sender label', () async {
      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.last.title, l10n.notifUnknownSender);
    });

    test('uses displayName when name is absent', () async {
      users['u1'] = {'displayName': 'Grace'};

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.last.title, 'Grace');
    });

    test('titles a group with the chat name', () async {
      chats['chat-1'] = {'type': 'GROUP', 'name': 'The Squad'};
      users['u1'] = {'name': 'Ada'};

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.last.title, 'The Squad');
    });

    test('falls back to the chatName field then the app name', () async {
      chats['chat-1'] = {'type': 'GROUP'};

      await manager.displayFromRemoteData({
        ...payload(),
        'chatName': 'From data',
      }, source: NotificationSource.socket);
      expect(notifications.last.title, 'From data');

      await manager.clearChat('chat-1');
      notifications.clearRecords();
      await manager.displayFromRemoteData(
        payload(id: 'm2'),
        source: NotificationSource.socket,
      );
      expect(notifications.last.title, appName);
    });

    test('treats an unknown chat type as a group', () async {
      chats['chat-1'] = {'type': 'FORUM', 'name': 'Forum'};

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.last.title, 'Forum');
    });

    test('collapses an empty body to a single space', () async {
      await manager.displayFromRemoteData(
        payload(content: '   '),
        source: NotificationSource.socket,
      );

      expect(notifications.last.body, ' ');
    });

    test('falls back to body when content is absent', () async {
      await manager.displayFromRemoteData({
        'chatUUID': 'chat-1',
        'body': 'from body',
        'messageId': 'm1',
      }, source: NotificationSource.socket);

      expect(notifications.last.body, 'from body');
    });
  });

  group('message decoding', () {
    test('decodes a JSON string message', () async {
      await manager.displayFromRemoteData({
        'chatUUID': 'chat-1',
        'senderUUID': 'u1',
        'messageId': 'm1',
        'message': '{"id": "m1", "type": "message", "content": "from json"}',
      }, source: NotificationSource.socket);

      expect(notifications.last.body, contains('from json'));
    });

    test('survives a malformed JSON message', () async {
      await manager.displayFromRemoteData({
        'chatUUID': 'chat-1',
        'senderUUID': 'u1',
        'content': 'plain fallback',
        'messageId': 'm1',
        'message': '{not json',
      }, source: NotificationSource.socket);

      expect(notifications.showCount, 1);
      expect(notifications.last.body, 'plain fallback');
    });

    test('ignores a list payload', () async {
      await manager.displayFromRemoteData({
        'chatUUID': 'chat-1',
        'content': 'still shown',
        'messageId': 'm1',
        'message': <dynamic>[],
      }, source: NotificationSource.socket);

      expect(notifications.showCount, 1);
    });
  });

  group('handleInboundMessage', () {
    test('builds the remote envelope from the socket message', () async {
      users['u1'] = {'name': 'Ada'};

      await manager.handleInboundMessage({
        'chatUUID': 'chat-1',
        'userUUID': 'u1',
        'id': 'm1',
        'content': 'inbound',
      });

      expect(notifications.showCount, 1);
      expect(notifications.last.body, 'inbound');
    });

    test('accepts the snake_case chat field', () async {
      await manager.handleInboundMessage({
        'chat_uuid': 'chat-1',
        'senderUUID': 'u1',
        'id': 'm1',
        'content': 'snake',
      });

      expect(notifications.showCount, 1);
    });
  });

  group('handleRemoteMessage', () {
    test('shows the message when the socket is closed', () async {
      manager.isSocketOpen = () => false;

      await manager.handleRemoteMessage(RemoteMessage(data: payload()));

      expect(notifications.showCount, 1);
    });

    test(
      'skips the push when the app is active and the socket is open',
      () async {
        manager.isSocketOpen = () => true;
        manager.setLifecycle(AppLifecycleState.resumed);

        await manager.handleRemoteMessage(RemoteMessage(data: payload()));

        expect(notifications.showCount, 0);
      },
    );
  });

  group('setLifecycle', () {
    test('resumed makes the app active', () async {
      manager.setLifecycle(AppLifecycleState.resumed);
      manager.activeChatUUID = () => 'chat-1';

      await manager.displayFromRemoteData(
        payload(),
        source: NotificationSource.socket,
      );

      expect(notifications.showCount, 0);
    });
  });
}
