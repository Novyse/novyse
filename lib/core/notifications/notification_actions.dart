import 'package:flutter/foundation.dart';

import 'package:novyse/core/auth/onboarding_manager.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/notifications/local_notification_service.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/storage/database/database.dart';

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
    if (chatUUID.isEmpty || messageId.isEmpty) return;
    try {
      final res = await Gateway.instance.message.read(
        chatUUID,
        subID,
        messageId,
      );
      if (res.success) {
        if (!AppDatabase.instance.isOpen) {
          await AppDatabase.instance.initialize();
        }
        await GlobalEventEmitter.instance.message.update(
          chatUUID,
          subID,
          messageId,
          'read',
          res.chatEventID,
          {'userUUID': res.userUUID, 'readAt': res.readAt},
        );
      }
    } catch (e) {
      debugPrint('[NotificationActions] markAsRead failed: $e');
    }
  }

  /// Send a quick reply from a notification
  static Future<void> handleReply({
    required String chatUUID,
    required int subID,
    required String text,
  }) async {
    final content = text.trim();
    if (content.isEmpty || chatUUID.isEmpty) return;

    if (!AppDatabase.instance.isOpen) {
      await AppDatabase.instance.initialize();
    }
    final userUUID = await onboardingManager.getUserUUID() ?? '';
    var sent = false;

    try {
      final tempId = DateTime.now().millisecondsSinceEpoch.toString();
      await QueueManager.instance.addOutgoingMessageJob(
        id: tempId,
        chatUUID: chatUUID,
        subID: subID,
        message: {
          'id': tempId,
          'chatUUID': chatUUID,
          'subID': subID,
          'senderUUID': userUUID,
          'userUUID': userUUID,
          'content': content,
          'type': 'message',
          'createdAt': DateTime.now().toUtc().toIso8601String(),
          'status': 'PENDING_SEND',
        },
      );
      sent = true;
    } catch (e) {
      debugPrint('[NotificationActions] queue reply failed: $e');
    }

    if (!sent) {
      try {
        final res = await Gateway.instance.message.send(
          chatUUID,
          subID: subID,
          content: content,
        );
        sent = res.success;
        if (sent && res.message != null) {
          await GlobalEventEmitter.instance.message.add({
            ...res.message!,
            'chatUUID': chatUUID,
            'subID': subID,
            'status': 'sent',
          });
        }
      } catch (e) {
        debugPrint('[NotificationActions] gateway reply failed: $e');
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
