import 'package:flutter/widgets.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart';

/// Sends a picked GIF as an immediate chat message (content = GIF URL).
///
/// Mirrors the legacy `handleSendOrEdit("message", url)` behavior:
/// the message is queued via [QueueManager] (optimistic UI included),
/// saved to recents, and the caller is expected to close the menu.
///
/// [ref] is `dynamic` on purpose, following the [ChatPasteHelper] convention:
/// it accepts both `WidgetRef` (widget call sites) and `ProviderContainer`
/// (tests), which are sibling types in Riverpod 2.x.
class GifSendHandler {
  const GifSendHandler._();

  static Future<void> sendGif({
    required dynamic ref,
    required String chatUUID,
    required int subID,
    required GifItem gif,
  }) async {
    final String localUserUUID = ref.read(userStoreProvider).localUserUUID;
    final tempId = DateTime.now().millisecondsSinceEpoch;
    final now = DateTime.now().toUtc().toIso8601String();
    final QueueManager queueManager = ref.read(queueManagerProvider);

    try {
      await queueManager.addOutgoingMessageJob(
        id: tempId.toString(),
        chatUUID: chatUUID,
        subID: subID,
        message: {
          'id': tempId,
          'chatUUID': chatUUID,
          'subID': subID,
          'senderUUID': localUserUUID,
          'userUUID': localUserUUID,
          'content': gif.url,
          'type': 'message',
          'createdAt': now,
          'status': 'PENDING_SEND',
        },
      );
    } catch (e) {
      debugPrint('[GifSendHandler] Error sending GIF via queue: $e');
      rethrow;
    }

    try {
      await ref.read(gifRecentsProvider.notifier).push(gif);
    } catch (e) {
      debugPrint('[GifSendHandler] Error saving GIF recent: $e');
    }
  }
}
