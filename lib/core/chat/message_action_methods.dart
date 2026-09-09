import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/forward_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';

/// Encapsulates action handlers for messages (reply, quote, copy, select, forward, delete, pin, edit, download).
class MessageActionMethods {
  final WidgetRef ref;
  final BuildContext context;
  final String chatUUID;
  final int subID;

  const MessageActionMethods({
    required this.ref,
    required this.context,
    required this.chatUUID,
    this.subID = 0,
  });

  /// Adds message to the draft replying list.
  void reply(MessageModel message) {
    ref.read(chatDraftProvider(chatUUID).notifier).addReply(message);
  }

  /// Quotes selected text of a message and adds it to the draft replying list.
  void quoteAndReply(MessageModel message, String selectedText) {
    int? rangeStart;
    int? rangeEnd;
    if (message.content != null && selectedText.trim().isNotEmpty) {
      final start = message.content!.indexOf(selectedText.trim());
      if (start != -1) {
        rangeStart = start;
        rangeEnd = start + selectedText.trim().length;
      }
    }
    ref
        .read(chatDraftProvider(chatUUID).notifier)
        .addReply(message, rangeStart: rangeStart, rangeEnd: rangeEnd);
  }

  /// Copies message content to clipboard.
  void copy(MessageModel message) {
    Clipboard.setData(ClipboardData(text: message.content ?? ''));
  }

  /// Copies selected text to clipboard.
  void copySelected(String text) {
    Clipboard.setData(ClipboardData(text: text));
  }

  /// Toggles message selection in multi-selection mode.
  void select(MessageModel message) {
    ref.read(chatDraftProvider(chatUUID).notifier).toggleSelectMessage(message);
  }

  /// Queues message for forwarding.
  void forward(MessageModel message) {
    ref.read(forwardProvider.notifier).setForwardMessages([message]);
  }

  /// Initiates editing of a message.
  void edit(MessageModel message) {
    final draftNotifier = ref.read(chatDraftProvider(chatUUID).notifier);
    draftNotifier.setEditingMessage(message);
    final content = message.content ?? '';
    draftNotifier.setText(content);

    final controller = ref.read(chatTextControllerProvider(chatUUID));
    if (controller.text != content) {
      controller.value = TextEditingValue(
        text: content,
        selection: TextSelection.collapsed(offset: content.length),
      );
    }

    // Populate draft files from the message's current file list
    final currentFiles = message.files
        .map((f) => Map<String, dynamic>.from(f))
        .toList();
    draftNotifier.setFiles(currentFiles);
    draftNotifier.setInvalidFiles([]);
  }

  /// Pins or unpins a message.
  Future<void> pin(MessageModel message) async {
    final messageIdStr = message.id.toString();
    final localUserUUID = ref.read(userStoreProvider).localUserUUID;
    final isPinned = message.pinned;

    if (isPinned) {
      try {
        final res = await apiGateway.message.pin.remove(
          chatUUID,
          subID,
          messageIdStr,
        );
        if (res.success) {
          await GlobalEventEmitter.instance.message.update(
            chatUUID,
            subID,
            messageIdStr,
            'pin_remove',
            res.chatEventID,
            {},
          );
        }
      } catch (e) {
        debugPrint('Error unpinning message: $e');
      }
    } else {
      try {
        final res = await apiGateway.message.pin.add(
          chatUUID,
          subID,
          messageIdStr,
        );
        if (res.success) {
          await GlobalEventEmitter.instance.message.update(
            chatUUID,
            subID,
            messageIdStr,
            'pin_add',
            res.chatEventID,
            {
              'pinnedAt': res.pinnedAt ?? DateTime.now().toIso8601String(),
              'userUUID': localUserUUID,
            },
          );
        }
      } catch (e) {
        debugPrint('Error pinning message: $e');
      }
    }
  }

  /// Downloads message attachments (placeholder).
  Future<void> download(MessageModel message) async {
    // Placeholder for download
  }

  /// Prompts for confirmation and deletes the message.
  Future<void> delete(MessageModel message) async {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text(l10n.delete),
        content: Text(l10n.deleteMessageConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: colorScheme.error,
              foregroundColor: colorScheme.onError,
            ),
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            child: Text(l10n.delete),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await apiGateway.message.delete(chatUUID, subID, message.id.toString());
      } catch (e) {
        debugPrint('Error deleting message on server: $e');
      }
      await GlobalEventEmitter.instance.message.update(
        chatUUID,
        subID,
        message.id.toString(),
        'delete',
        null,
        {},
      );
    }
  }
}
