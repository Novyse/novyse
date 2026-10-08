import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/message_action_methods.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';

/// Handles keyboard shortcuts for the chat message input.
///
/// Supported shortcuts:
/// - `Enter`: Sends message (when `chat.sendWithEnter` is true) or inserts newline (when false).
/// - `Shift + Enter`: Inserts newline.
/// - `Arrow Up`: When input is empty, initiates edit of the user's latest message
///   or reply to the conversation's latest message if sent by someone else.
/// - `Escape`: Cancels ongoing message editing or clears active message replies.
abstract final class ChatKeyboardHandler {
  /// Inserts a newline character at the current selection or end of text,
  /// updating the controller and synchronizing with the chat draft store.
  static void insertNewline(
    TextEditingController controller,
    WidgetRef ref,
    String chatUUID,
  ) {
    final text = controller.text;
    final selection = controller.selection;
    if (selection.isValid &&
        selection.start >= 0 &&
        selection.end <= text.length) {
      final start = selection.start;
      final end = selection.end;
      final newText = text.replaceRange(start, end, '\n');
      controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: start + 1),
      );
    } else {
      final newText = '$text\n';
      controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: newText.length),
      );
    }
    ref.read(chatDraftProvider(chatUUID).notifier).setText(controller.text);
  }

  /// Evaluates and handles a [KeyEvent] in the chat input context.
  static KeyEventResult handleKeyEvent({
    required KeyEvent event,
    required WidgetRef ref,
    required BuildContext context,
    required String chatUUID,
    required int subID,
    required TextEditingController textController,
    FocusNode? focusNode,
    required VoidCallback onSendMessage,
  }) {
    if (event is KeyUpEvent) {
      return KeyEventResult.ignored;
    }

    final isKeyDown = event is KeyDownEvent;
    final isKeyRepeat = event is KeyRepeatEvent;
    if (!isKeyDown && !isKeyRepeat) {
      return KeyEventResult.ignored;
    }

    final logicalKey = event.logicalKey;
    final isEnter = logicalKey == LogicalKeyboardKey.enter ||
        logicalKey == LogicalKeyboardKey.numpadEnter;
    final isArrowUp = logicalKey == LogicalKeyboardKey.arrowUp;
    final isEscape = logicalKey == LogicalKeyboardKey.escape;

    if (!isEnter && !isArrowUp && !isEscape) {
      return KeyEventResult.ignored;
    }

    final isControlOrMeta = HardwareKeyboard.instance.isControlPressed ||
        HardwareKeyboard.instance.isMetaPressed;
    final isShift = HardwareKeyboard.instance.isShiftPressed;
    final isAlt = HardwareKeyboard.instance.isAltPressed;

    if (isAlt) {
      return KeyEventResult.ignored;
    }

    // 1. Enter and Shift+Enter shortcuts
    if (isEnter) {
      if (isControlOrMeta) {
        return KeyEventResult.ignored;
      }

      final sendWithEnter =
          ref.read(settingValueProvider('chat.sendWithEnter')) as bool? ?? true;

      if (sendWithEnter) {
        if (!isShift) {
          if (isKeyDown) {
            onSendMessage();
          }
          return KeyEventResult.handled;
        } else {
          insertNewline(textController, ref, chatUUID);
          return KeyEventResult.handled;
        }
      } else {
        insertNewline(textController, ref, chatUUID);
        return KeyEventResult.handled;
      }
    }

    // 2. Arrow Up: edit latest message if mine, or reply to latest message if from someone else
    if (isArrowUp) {
      if (isControlOrMeta || isShift || textController.text.isNotEmpty || !isKeyDown) {
        return KeyEventResult.ignored;
      }

      final draftState = ref.read(chatDraftProvider(chatUUID));
      if (draftState.editingMessage != null) {
        return KeyEventResult.ignored;
      }

      final messagesState = ref.read(
        chatMessagesProvider((chatUUID: chatUUID, subID: subID)),
      );
      final lastMessage =
          messagesState.messages.where((m) => !m.isSystem).firstOrNull;
      if (lastMessage == null) {
        return KeyEventResult.ignored;
      }

      final localUserUUID = ref.read(
        userStoreProvider.select((s) => s.localUserUUID),
      );
      final isMine = lastMessage.userUUID == localUserUUID;

      final methods = MessageActionMethods(
        ref: ref,
        context: context,
        chatUUID: chatUUID,
        subID: subID,
      );

      if (isMine) {
        methods.edit(lastMessage);
        final content = lastMessage.content ?? '';
        if (textController.text != content) {
          textController.value = TextEditingValue(
            text: content,
            selection: TextSelection.collapsed(offset: content.length),
          );
        }
      } else {
        methods.reply(lastMessage);
      }

      focusNode?.requestFocus();
      return KeyEventResult.handled;
    }

    // 3. Escape: cancel editing or clear reply
    if (isEscape) {
      if (isControlOrMeta || isShift || !isKeyDown) {
        return KeyEventResult.ignored;
      }

      final draftState = ref.read(chatDraftProvider(chatUUID));
      if (draftState.editingMessage != null) {
        ref.read(chatDraftProvider(chatUUID).notifier).cancelEdit();
        textController.clear();
        return KeyEventResult.handled;
      }

      if (draftState.replyingTo.isNotEmpty) {
        ref.read(chatDraftProvider(chatUUID).notifier).clearReplies();
        return KeyEventResult.handled;
      }

      return KeyEventResult.ignored;
    }

    return KeyEventResult.ignored;
  }
}
