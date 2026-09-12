import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/notifications/local_notification_service.dart';
import 'package:novyse/core/router/navigator_keys.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/stores/user_store.dart';

abstract final class NotificationActionIds {
  static const reply = 'reply';
  static const markAsRead = 'mark_read';
}

/// Handles notification actions
class NotificationActions {
  NotificationActions._();

  /// Mark chat message as read from a notification.
  static Future<void> handleMarkAsRead({
    required String chatUUID,
    required int subID,
    required String messageId,
  }) async {
    // TODO: call Gateway.instance.message.read + local DB update.
  }

  /// Send a quick reply from a notification
  static Future<void> handleReply({
    required String chatUUID,
    required int subID,
    required String text,
  }) async {
    final content = text.trim();
    if (content.isEmpty || chatUUID.isEmpty) return;

    var sent = false;

    try {
      final context = rootNavigatorKey.currentContext;
      if (context != null) {
        final container = ProviderScope.containerOf(context, listen: false);
        final localUserUUID = container.read(userStoreProvider).localUserUUID;
        final tempId = DateTime.now().millisecondsSinceEpoch.toString();
        final now = DateTime.now().toUtc().toIso8601String();

        await container.read(queueManagerProvider).addOutgoingMessageJob(
          id: tempId,
          chatUUID: chatUUID,
          subID: subID,
          message: {
            'id': tempId,
            'chatUUID': chatUUID,
            'subID': subID,
            'senderUUID': localUserUUID,
            'userUUID': localUserUUID,
            'content': content,
            'type': 'message',
            'createdAt': now,
            'status': 'PENDING_SEND',
          },
        );
        sent = true;
      }
    } catch (e, st) {
      debugPrint('[NotificationActions] queue reply failed: $e\n$st');
    }

    if (!sent) {
      try {
        final res = await Gateway.instance.message.send(
          chatUUID,
          subID: subID,
          content: content,
        );
        sent = res.success;
      } catch (e, st) {
        debugPrint('[NotificationActions] gateway reply failed: $e\n$st');
      }
    }

    if (sent) {
      await LocalNotificationService.instance.reflectOwnReply(
        chatUUID: chatUUID,
        text: content,
      );
    } else {
      await LocalNotificationService.instance.clearChat(chatUUID);
    }
  }
}
