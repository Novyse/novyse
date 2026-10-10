import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/services/api_gateway.dart';

class MessageActionsService {
  const MessageActionsService(this._gateway);

  final Gateway _gateway;

  /// Deletes one message. Returns true when the local copy was removed.
  Future<bool> delete({
    required String chatUUID,
    required int subID,
    required String messageID,
  }) async {
    try {
      final res = await _gateway.message.delete(chatUUID, subID, messageID);
      if (!res.success) {
        debugPrint('[MessageActions] Delete rejected for $messageID');
        return false;
      }
      await GlobalEventEmitter.instance.message.update(
        chatUUID,
        subID,
        messageID,
        'delete',
        res.chatEventID,
        {},
      );
      return true;
    } catch (e) {
      debugPrint('[MessageActions] Delete failed for $messageID: $e');
      return false;
    }
  }
}

/// Riverpod provider for [MessageActionsService].
final messageActionsServiceProvider = Provider<MessageActionsService>(
  (ref) => MessageActionsService(apiGateway),
);
