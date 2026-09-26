import 'package:flutter/foundation.dart' show debugPrint;

import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/storage/database/database.dart';

/// Sends read receipts as watermarks: one API call per visible batch.
///
/// Backend (`POST /message/read`) stores one row for the given message;
/// MessageEnrichment applies that watermark to earlier messages in the UI.
/// Receipts are only ever sent for messages actually displayed on screen.
class MessageReadService {
  MessageReadService._();
  static final MessageReadService instance = MessageReadService._();

  /// Marks everything up to [messageID] as read. No-op for empty ids.
  Future<bool> markUpTo({
    required String chatUUID,
    required int subID,
    required String localUserUUID,
    required int messageID,
    bool Function()? isStillActive,
  }) async {
    if (chatUUID.isEmpty || localUserUUID.isEmpty || messageID <= 0) {
      return false;
    }
    try {
      // The caller may have navigated away while preparing the call.
      if (isStillActive != null && !isStillActive()) return false;

      final res = await apiGateway.message.read(
        chatUUID,
        subID,
        messageID.toString(),
      );
      if (!res.success) return false;

      await GlobalEventEmitter.instance.message.update(
        chatUUID,
        subID,
        messageID.toString(),
        'read',
        res.chatEventID,
        {'userUUID': res.userUUID, 'readAt': res.readAt},
      );
      return true;
    } catch (e) {
      debugPrint('[MessageReadService] markUpTo failed: $e');
      return false;
    }
  }

  Future<bool> markNotificationMessageAsRead({
    required String chatUUID,
    required int subID,
    required String messageID,
  }) async {
    if (chatUUID.isEmpty || messageID.isEmpty) return false;
    try {
      final db = AppDatabase.instance;
      if (!db.isOpen) await db.initialize();

      final res = await apiGateway.message.read(chatUUID, subID, messageID);
      if (!res.success) return false;

      await GlobalEventEmitter.instance.message.update(
        chatUUID,
        subID,
        messageID,
        'read',
        res.chatEventID,
        {'userUUID': res.userUUID, 'readAt': res.readAt},
      );
      eventBus.emit(
        ChatBadgeDecrementEvent(
          chatUUID: chatUUID,
          subID: subID,
          targetId: int.tryParse(messageID) ?? 0,
          count: 1,
        ),
      );
      return true;
    } catch (e) {
      debugPrint('[MessageReadService] notification read failed: $e');
      return false;
    }
  }
}
