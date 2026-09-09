import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:markdown_editor_live/markdown_editor_live.dart';
import 'package:novyse/core/stores/message_store.dart';

/// Available content views in active chat: 'chat' | 'vocal' | 'both'.
enum ContentView {
  chat('chat'),
  vocal('vocal'),
  both('both');

  final String value;
  const ContentView(this.value);

  static ContentView fromString(String val) {
    return switch (val.toLowerCase()) {
      'vocal' => ContentView.vocal,
      'both' => ContentView.both,
      _ => ContentView.chat,
    };
  }
}

/// Represents a message being replied to or quoted in the draft.
@immutable
class ChatReplyItem {
  final MessageModel message;
  final int? rangeStart;
  final int? rangeEnd;

  const ChatReplyItem({required this.message, this.rangeStart, this.rangeEnd});

  bool get isQuote => rangeStart != null && rangeEnd != null;
}

/// Immutable state representing unsent draft and UI controls for a specific chat matching `ChatUIState`.
@immutable
class ChatDraftState {
  final String newMessageText;
  final List<dynamic> files;
  final List<dynamic> invalidFiles;
  final MessageModel? editingMessage;
  final List<MessageModel> selectedMessages;
  final List<ChatReplyItem> replyingTo;
  final int selectedSub;
  final String contentView; // 'chat' | 'vocal' | 'both'

  const ChatDraftState({
    this.newMessageText = '',
    this.files = const [],
    this.invalidFiles = const [],
    this.editingMessage,
    this.selectedMessages = const [],
    this.replyingTo = const [],
    this.selectedSub = 0,
    this.contentView = 'chat',
  });

  ChatDraftState copyWith({
    String? newMessageText,
    List<dynamic>? files,
    List<dynamic>? invalidFiles,
    MessageModel? Function()? editingMessage,
    List<MessageModel>? selectedMessages,
    List<ChatReplyItem>? replyingTo,
    int? selectedSub,
    String? contentView,
  }) {
    return ChatDraftState(
      newMessageText: newMessageText ?? this.newMessageText,
      files: files ?? this.files,
      invalidFiles: invalidFiles ?? this.invalidFiles,
      editingMessage: editingMessage != null
          ? editingMessage()
          : this.editingMessage,
      selectedMessages: selectedMessages ?? this.selectedMessages,
      replyingTo: replyingTo ?? this.replyingTo,
      selectedSub: selectedSub ?? this.selectedSub,
      contentView: contentView ?? this.contentView,
    );
  }
}

/// Family Notifier holding the draft UI state for each chat independently.
class ChatDraftNotifier extends FamilyNotifier<ChatDraftState, String> {
  @override
  ChatDraftState build(String arg) {
    return const ChatDraftState();
  }

  void setText(String text) {
    state = state.copyWith(newMessageText: text);
  }

  void setFiles(List<dynamic> files) {
    state = state.copyWith(files: files);
  }

  void setInvalidFiles(List<dynamic> invalidFiles) {
    state = state.copyWith(invalidFiles: invalidFiles);
  }

  void setReplyingTo(List<ChatReplyItem> replyingTo) {
    state = state.copyWith(replyingTo: replyingTo);
  }

  /// Adds a reply, adhering to the 3-reply limit FIFO eviction rule and duplicate avoidance.
  void addReply(MessageModel message, {int? rangeStart, int? rangeEnd}) {
    // Avoid duplicate message + range
    final alreadyExists = state.replyingTo.any(
      (r) =>
          r.message.id.toString() == message.id.toString() &&
          r.rangeStart == rangeStart &&
          r.rangeEnd == rangeEnd,
    );
    if (alreadyExists) return;

    final item = ChatReplyItem(
      message: message,
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
    );

    List<ChatReplyItem> updated = List<ChatReplyItem>.from(state.replyingTo);
    if (updated.length >= 3) {
      updated = [...updated.sublist(1), item];
    } else {
      updated.add(item);
    }

    state = state.copyWith(replyingTo: updated, editingMessage: () => null);
  }

  /// Removes a reply item by its message ID.
  void removeReply(dynamic id) {
    final targetId = id?.toString();
    final updated = state.replyingTo
        .where((r) => r.message.id.toString() != targetId)
        .toList();
    state = state.copyWith(replyingTo: updated);
  }

  void setEditingMessage(MessageModel? message) {
    state = state.copyWith(editingMessage: () => message);
  }

  /// Cancels the edit, restoring the text controller state and clearing files.
  void cancelEdit() {
    state = state.copyWith(
      editingMessage: () => null,
      files: const [],
      invalidFiles: const [],
      newMessageText: '',
    );
  }

  void setSelectedMessages(List<MessageModel> messages) {
    state = state.copyWith(selectedMessages: messages);
  }

  /// Toggles selection of a message.
  void toggleSelectMessage(MessageModel message) {
    final exists = state.selectedMessages.any(
      (m) => m.id.toString() == message.id.toString(),
    );

    if (exists) {
      state = state.copyWith(
        selectedMessages: state.selectedMessages
            .where((m) => m.id.toString() != message.id.toString())
            .toList(),
      );
    } else {
      state = state.copyWith(
        selectedMessages: [...state.selectedMessages, message],
      );
    }
  }

  /// Clears all selected messages.
  void clearSelectedMessages() {
    state = state.copyWith(selectedMessages: const []);
  }

  void setSelectedSub(int sub) {
    state = state.copyWith(selectedSub: sub);
  }

  void setContentView(String view) {
    state = state.copyWith(contentView: view);
  }

  void clear() {
    state = const ChatDraftState();
  }
}

/// Family provider that isolates draft UI state for every chat.
final chatDraftProvider =
    NotifierProvider.family<ChatDraftNotifier, ChatDraftState, String>(
      ChatDraftNotifier.new,
    );

/// Provider that holds the text controller for each chat.
/// The controller is automatically synced with the draft store.
/// Changes to the controller update the draft store, and changes to the
/// draft store are reflected in the controller.
final chatTextControllerProvider =
    Provider.family<MarkdownEditingController, String>((ref, chatUUID) {
      final controller = MarkdownEditingController();
      final draftText = ref.read(chatDraftProvider(chatUUID)).newMessageText;
      if (draftText.isNotEmpty && controller.text != draftText) {
        controller.text = draftText;
      }

      // Listen to controller changes and update draft store
      void onControllerChanged() {
        ref.read(chatDraftProvider(chatUUID).notifier).setText(controller.text);
      }

      controller.addListener(onControllerChanged);
      ref.onDispose(() {
        controller.removeListener(onControllerChanged);
        controller.dispose();
      });

      return controller;
    });
