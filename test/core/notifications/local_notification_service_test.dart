import 'dart:convert';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/notifications/local_notification_service.dart';

import '../../helpers/fake_notifications.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeNotifications notifications;
  late LocalNotificationService service;
  final l10n = lookupAppL10n();

  setUp(() async {
    notifications = FakeNotifications.install();
    service = LocalNotificationService.instance;
    // The service is a singleton that keeps a per-chat message thread, so the
    // history has to be dropped between tests.
    await service.clearAll();
    await service.ensureInitialized();
    notifications.clearRecords();
  });

  group('showChatMessage', () {
    test('shows a DM notification keyed by the chat uuid', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'Ada',
        body: 'hello there',
        senderName: 'Ada',
        senderUUID: 'u1',
        messageId: '42',
      );

      expect(notifications.showCount, 1);
      final shown = notifications.last;
      expect(shown.id, 'chat-1'.hashCode & 0x7fffffff);
      expect(shown.title, 'Ada');
      expect(shown.body, 'hello there');
    });

    test(
      'encodes the chatUUID, subID and messageId into the payload',
      () async {
        await service.showChatMessage(
          chatUUID: 'chat-1',
          title: 'Ada',
          body: 'hi',
          senderName: 'Ada',
          messageId: '42',
          subID: 3,
        );

        expect(jsonDecode(notifications.last.payload!), {
          'chatUUID': 'chat-1',
          'subID': '3',
          'messageId': '42',
        });
      },
    );

    test('omits messageId from the payload when it is null', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'Ada',
        body: 'hi',
        senderName: 'Ada',
      );

      expect(jsonDecode(notifications.last.payload!), {
        'chatUUID': 'chat-1',
        'subID': '0',
      });
    });

    test(
      'uses the messaging style with the sender as the conversation',
      () async {
        await service.showChatMessage(
          chatUUID: 'chat-1',
          title: 'Ada',
          body: 'hi',
          senderName: 'Ada',
        );

        final shown = notifications.last;
        expect(shown.conversation, 'Ada');
        expect(shown.messages, ['hi']);
      },
    );

    test('prefixes the body with the sender in a group chat', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'The Squad',
        body: 'hi all',
        senderName: 'Ada',
        isGroup: true,
      );

      expect(
        notifications.last.body,
        l10n.notifGroupMessageBody('Ada', 'hi all'),
      );
    });

    test('accumulates messages in the thread for the same chat', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'Ada',
        body: 'first',
        senderName: 'Ada',
      );
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'Ada',
        body: 'second',
        senderName: 'Ada',
      );

      expect(notifications.last.messages, ['first', 'second']);
    });

    test('keeps separate threads per chat', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'Ada',
        body: 'in one',
        senderName: 'Ada',
      );
      await service.showChatMessage(
        chatUUID: 'chat-2',
        title: 'Grace',
        body: 'in two',
        senderName: 'Grace',
      );

      expect(notifications.last.id, 'chat-2'.hashCode & 0x7fffffff);
      expect(notifications.last.messages, ['in two']);
    });

    test('caps the thread history at the ten most recent messages', () async {
      for (var i = 0; i < 12; i++) {
        await service.showChatMessage(
          chatUUID: 'chat-1',
          title: 'Ada',
          body: 'message $i',
          senderName: 'Ada',
        );
      }

      final messages = notifications.last.messages;
      expect(messages, hasLength(10));
      expect(messages.first, 'message 2');
      expect(messages.last, 'message 11');
    });
  });

  group('reflectOwnReply', () {
    test('appends the reply to the existing thread', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'Ada',
        body: 'ping',
        senderName: 'Ada',
      );

      await service.reflectOwnReply(chatUUID: 'chat-1', text: '  pong  ');

      expect(notifications.last.messages, ['ping', 'pong']);
    });

    test('clears the chat when there is no thread to reply into', () async {
      await service.reflectOwnReply(chatUUID: 'unknown', text: 'pong');

      expect(notifications.cancelled, ['unknown'.hashCode & 0x7fffffff]);
      expect(notifications.showCount, 0);
    });

    test('clears the chat for an empty reply', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'Ada',
        body: 'ping',
        senderName: 'Ada',
      );

      await service.reflectOwnReply(chatUUID: 'chat-1', text: '   ');

      expect(notifications.showCount, 1);
      expect(notifications.cancelled, ['chat-1'.hashCode & 0x7fffffff]);
    });

    test('preserves the stored title when reposting', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'The Squad',
        body: 'ping',
        senderName: 'Ada',
        isGroup: true,
      );

      await service.reflectOwnReply(chatUUID: 'chat-1', text: 'pong');

      expect(notifications.last.title, 'The Squad');
      expect(
        notifications.last.body,
        l10n.notifGroupMessageBody(l10n.notifMe, 'pong'),
      );
    });
  });

  group('clearChat', () {
    test('cancels the notification for that chat', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'Ada',
        body: 'hi',
        senderName: 'Ada',
      );

      await service.clearChat('chat-1');

      expect(notifications.cancelled, ['chat-1'.hashCode & 0x7fffffff]);
    });

    test('drops the stored thread', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'Ada',
        body: 'hi',
        senderName: 'Ada',
      );
      await service.clearChat('chat-1');

      await service.reflectOwnReply(chatUUID: 'chat-1', text: 'pong');

      expect(notifications.showCount, 1);
    });
  });

  group('clearAll', () {
    test('cancels every notification', () async {
      await service.clearAll();

      expect(notifications.cancelledAll, hasLength(1));
    });

    test('drops every stored thread', () async {
      await service.showChatMessage(
        chatUUID: 'chat-1',
        title: 'Ada',
        body: 'hi',
        senderName: 'Ada',
      );
      await service.clearAll();

      await service.reflectOwnReply(chatUUID: 'chat-1', text: 'pong');

      expect(notifications.showCount, 1);
    });
  });

  group('ensureInitialized', () {
    test('does not re-initialize the plugin on a repeat call', () async {
      final afterFirst = notifications.inits.length;
      await service.ensureInitialized();
      await service.ensureInitialized();

      expect(notifications.inits, hasLength(afterFirst));
      expect(afterFirst, lessThanOrEqualTo(1));
    });
  });

  group('handleNotificationResponse', () {
    test('forwards a default tap with the chat and sub', () async {
      final taps = <(String?, int)>[];
      service.onTap = (chatUUID, subID) => taps.add((chatUUID, subID));
      addTearDown(() => service.onTap = null);

      await LocalNotificationService.handleNotificationResponse(
        NotificationResponse(
          notificationResponseType:
              NotificationResponseType.selectedNotification,
          payload: jsonEncode({'chatUUID': 'chat-1', 'subID': '4'}),
        ),
      );

      expect(taps, [('chat-1', 4)]);
    });

    test('defaults a missing sub to zero', () async {
      final taps = <(String?, int)>[];
      service.onTap = (chatUUID, subID) => taps.add((chatUUID, subID));
      addTearDown(() => service.onTap = null);

      await LocalNotificationService.handleNotificationResponse(
        NotificationResponse(
          notificationResponseType:
              NotificationResponseType.selectedNotification,
          payload: jsonEncode({'chatUUID': 'chat-1'}),
        ),
      );

      expect(taps, [('chat-1', 0)]);
    });

    test('treats a non-JSON payload as a bare chat uuid', () async {
      final taps = <(String?, int)>[];
      service.onTap = (chatUUID, subID) => taps.add((chatUUID, subID));
      addTearDown(() => service.onTap = null);

      await LocalNotificationService.handleNotificationResponse(
        const NotificationResponse(
          notificationResponseType:
              NotificationResponseType.selectedNotification,
          payload: 'chat-legacy',
        ),
      );

      expect(taps, [('chat-legacy', 0)]);
    });

    test('reports a null chat for an unparseable payload', () async {
      final taps = <(String?, int)>[];
      service.onTap = (chatUUID, subID) => taps.add((chatUUID, subID));
      addTearDown(() => service.onTap = null);

      await LocalNotificationService.handleNotificationResponse(
        const NotificationResponse(
          notificationResponseType:
              NotificationResponseType.selectedNotification,
        ),
      );

      expect(taps, [(null, 0)]);
    });

    test('does not fire onTap for a mark-as-read action', () async {
      final taps = <(String?, int)>[];
      service.onTap = (chatUUID, subID) => taps.add((chatUUID, subID));
      addTearDown(() => service.onTap = null);

      await LocalNotificationService.handleNotificationResponse(
        NotificationResponse(
          actionId: 'mark_read',
          notificationResponseType:
              NotificationResponseType.selectedNotification,
          payload: jsonEncode({'chatUUID': 'chat-1', 'subID': '0'}),
        ),
      );

      expect(taps, isEmpty);
    });
  });

  group('notificationTapBackground', () {
    test('is a no-op-safe entry point', () {
      expect(
        () => notificationTapBackground(
          const NotificationResponse(
            notificationResponseType:
                NotificationResponseType.selectedNotification,
            payload: 'chat-1',
          ),
        ),
        returnsNormally,
      );
    });
  });
}
