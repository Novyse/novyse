import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/user_store.dart';

/// Handles sending new messages and submitting message edits for the bottom bar.
class MessageSendHandler {
  final WidgetRef ref;
  final BuildContext context;
  final String chatUUID;
  final int subID;
  final void Function(bool isSending)? onSendingChanged;

  const MessageSendHandler({
    required this.ref,
    required this.context,
    required this.chatUUID,
    this.subID = 0,
    this.onSendingChanged,
  });

  /// Sends a new message using the queue manager.
  Future<void> handleSendMessage() async {
    final controller = ref.read(chatTextControllerProvider(chatUUID));
    final text = controller.text.trim();
    final draftState = ref.read(chatDraftProvider(chatUUID));
    final files = List<dynamic>.from(draftState.files);

    // If both text and files are empty, do nothing
    if (text.isEmpty && files.isEmpty) return;

    // Check if there are invalid files
    if (draftState.invalidFiles.isNotEmpty) {
      if (context.mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.removeInvalidFilesBeforeSending),
            duration: const Duration(seconds: 2),
          ),
        );
      }
      return;
    }

    final replyingTo = List<ChatReplyItem>.from(draftState.replyingTo);

    onSendingChanged?.call(true);
    controller.clear();
    ref.read(chatDraftProvider(chatUUID).notifier).setText('');
    ref.read(chatDraftProvider(chatUUID).notifier).setFiles([]);
    ref.read(chatDraftProvider(chatUUID).notifier).setInvalidFiles([]);
    ref.read(chatDraftProvider(chatUUID).notifier).setReplyingTo([]);

    try {
      final localUserUUID = ref.read(userStoreProvider).localUserUUID;
      final tempId = DateTime.now().millisecondsSinceEpoch;
      final now = DateTime.now().toUtc().toIso8601String();

      final queueManager = ref.read(queueManagerProvider);
      final filesPayload = files.isNotEmpty
          ? files.map((f) => Map<String, dynamic>.from(f as Map)).toList()
          : null;

      final replyTos = replyingTo.map((item) {
        return <String, dynamic>{
          'chatUUID': item.message.chatUUID,
          'subID': item.message.subID,
          'messageID': item.message.id,
          'rangeStart': ?item.rangeStart,
          'rangeEnd': ?item.rangeEnd,
        };
      }).toList();

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
          'content': text,
          'type': 'message',
          'createdAt': now,
          'status': 'PENDING_SEND',
          'files': ?filesPayload,
          if (replyTos.isNotEmpty) 'replyTos': replyTos,
        },
        files: filesPayload,
      );
    } catch (e) {
      debugPrint('[MessageSendHandler] Error sending message via queue: $e');
    } finally {
      onSendingChanged?.call(false);
    }
  }

  /// Submits an edited message as a persistent queue job.
  Future<void> handleEditMessage() async {
    final controller = ref.read(chatTextControllerProvider(chatUUID));
    final newContent = controller.text.trim();
    final draftState = ref.read(chatDraftProvider(chatUUID));
    final editingMessage = draftState.editingMessage;
    if (editingMessage == null) return;

    if (draftState.invalidFiles.isNotEmpty) {
      if (context.mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.removeInvalidFilesBeforeSending),
            duration: const Duration(seconds: 2),
          ),
        );
      }
      return;
    }

    final files = draftState.files;

    // Both text and files cannot be empty
    if (newContent.isEmpty && files.isEmpty) {
      if (context.mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.messageCannotBeEmpty),
            duration: const Duration(seconds: 2),
          ),
        );
      }
      return;
    }

    final currentFileUUIDs = files
        .map((f) => f['uuid']?.toString())
        .whereType<String>()
        .toSet();

    final originalFileUUIDs = editingMessage.files
        .map((f) => f['uuid']?.toString())
        .whereType<String>()
        .toSet();

    final newFiles = files.where((f) => f['uuid'] == null).toList();

    final originalContent = (editingMessage.content ?? '').trim();
    final contentChanged = newContent != originalContent;
    final filesChanged = newFiles.isNotEmpty ||
        currentFileUUIDs.length != originalFileUUIDs.length ||
        !currentFileUUIDs.containsAll(originalFileUUIDs);

    // If nothing changed, cancel edit and return
    if (!contentChanged && !filesChanged) {
      ref.read(chatDraftProvider(chatUUID).notifier).cancelEdit();
      controller.clear();
      return;
    }

    // Full files payload representing the message's desired files state
    final filesPayload = files.map((f) {
      final m = <String, dynamic>{
        'name': (f['name'] ?? 'file').toString(),
        'mimeType': (f['mimeType'] ?? defaultMimeType).toString(),
        'size': f['size'] is num ? (f['size'] as num).toInt() : 0,
      };
      if (f['uuid'] != null) {
        m['uuid'] = f['uuid'].toString();
      }
      if (f['uri'] != null) m['uri'] = f['uri'];
      if (f['path'] != null) m['path'] = f['path'];
      if (f['bytes'] != null) m['bytes'] = f['bytes'];
      return m;
    }).toList();

    // Reset draft edit state immediately in UI
    ref.read(chatDraftProvider(chatUUID).notifier).cancelEdit();
    controller.clear();

    // Delegate execution, retries, and error handling entirely to QueueManager
    final queueManager = ref.read(queueManagerProvider);
    final tempId = DateTime.now().millisecondsSinceEpoch;

    await queueManager.addEditMessageJob(
      id: 'edit_${editingMessage.id}_$tempId',
      chatUUID: chatUUID,
      subID: editingMessage.subID,
      messageID: editingMessage.id.toString(),
      newContent: newContent,
      files: filesPayload,
      filesChanged: filesChanged,
      originalMessage: {
        'id': editingMessage.id,
        'chatUUID': editingMessage.chatUUID,
        'subID': editingMessage.subID,
        'content': editingMessage.content,
        'files': editingMessage.files,
      },
    );
  }
}
