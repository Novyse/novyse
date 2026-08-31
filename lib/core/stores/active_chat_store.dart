import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';

/// State of currently active/open chat session
@immutable
class ActiveChatState {
  final String? selectedChatUUID;
  final String? selectedHandle;
  final int selectedSub;
  final String contentView; // 'chat' | 'vocal' | 'both'
  final String? scrollToMessageID;
  final String? messageHighlight;
  final double headerHeight;
  final Map<String, dynamic>? activeRemoteChatData;

  const ActiveChatState({
    this.selectedChatUUID,
    this.selectedHandle,
    this.selectedSub = 0,
    this.contentView = 'chat',
    this.scrollToMessageID,
    this.messageHighlight,
    this.headerHeight = 0,
    this.activeRemoteChatData,
  });

  bool get hasActiveChat =>
      selectedChatUUID != null ||
      selectedHandle != null ||
      activeRemoteChatData != null;

  ActiveChatState copyWith({
    String? Function()? selectedChatUUID,
    String? Function()? selectedHandle,
    int? selectedSub,
    String? contentView,
    String? Function()? scrollToMessageID,
    String? Function()? messageHighlight,
    double? headerHeight,
    Map<String, dynamic>? Function()? activeRemoteChatData,
  }) {
    return ActiveChatState(
      selectedChatUUID: selectedChatUUID != null
          ? selectedChatUUID()
          : this.selectedChatUUID,
      selectedHandle: selectedHandle != null
          ? selectedHandle()
          : this.selectedHandle,
      selectedSub: selectedSub ?? this.selectedSub,
      contentView: contentView ?? this.contentView,
      scrollToMessageID: scrollToMessageID != null
          ? scrollToMessageID()
          : this.scrollToMessageID,
      messageHighlight: messageHighlight != null
          ? messageHighlight()
          : this.messageHighlight,
      headerHeight: headerHeight ?? this.headerHeight,
      activeRemoteChatData: activeRemoteChatData != null
          ? activeRemoteChatData()
          : this.activeRemoteChatData,
    );
  }
}

/// Riverpod Notifier managing the currently active chat navigation and selection.
class ActiveChatNotifier extends Notifier<ActiveChatState> {
  @override
  ActiveChatState build() {
    return const ActiveChatState();
  }

  void setSelectedChatUUID(String? uuid, {int? subOverride}) {
    if (uuid != null && state.selectedChatUUID == uuid && subOverride == null) {
      return;
    }

    final targetSub = subOverride ?? 0;

    state = state.copyWith(
      selectedChatUUID: () => uuid,
      selectedHandle: () => null,
      selectedSub: targetSub,
      activeRemoteChatData: () => null,
    );

    if (uuid != null) {
      ref.read(chatListProvider.notifier).markAsRead(uuid);
    }
  }

  Future<void> setSelectedHandle(String? handle, {int? subOverride}) async {
    if (handle == null || handle.isEmpty) {
      clear();
      return;
    }

    if (state.selectedHandle?.toLowerCase() == handle.toLowerCase() &&
        subOverride == null) {
      return;
    }

    final localChats = ref.read(chatListProvider).chats;
    final localUserUUID = ref.read(userStoreProvider).localUserUUID;

    // Check if we have this chat locally by handle or DM partner handle
    ChatModel? matchedLocalChat;
    for (final chat in localChats) {
      if (chat.handle?.toLowerCase() == handle.toLowerCase()) {
        matchedLocalChat = chat;
        break;
      }
      if (chat.type == 'DM') {
        for (final member in chat.members) {
          final memberUUID = (member['uuid'] ?? member['userUUID']) as String?;
          if (memberUUID != null && memberUUID != localUserUUID) {
            final memberHandle =
                (member['handle'] ?? member['user']?['handle']) as String?;
            if (memberHandle?.toLowerCase() == handle.toLowerCase()) {
              matchedLocalChat = chat;
              break;
            }
          }
        }
        if (matchedLocalChat != null) break;
      }
    }

    if (matchedLocalChat != null) {
      setSelectedChatUUID(matchedLocalChat.uuid, subOverride: subOverride);
      return;
    }

    // Set temporary handle state while fetching remote chat info
    state = state.copyWith(
      selectedHandle: () => handle,
      selectedChatUUID: () => null,
      selectedSub: subOverride ?? 0,
      activeRemoteChatData: () => null,
    );

    try {
      final response = await apiGateway.gather.handle(handle, detailed: true);
      if (response.success && response.data != null) {
        final fetchedChat = Map<String, dynamic>.from(response.data!);

        if (fetchedChat['type'] == 'USER') {
          fetchedChat['members'] = [
            {'uuid': fetchedChat['uuid']},
          ];
        }

        final fetchedUUID = fetchedChat['uuid'] as String?;

        // Check if now exists in local chats
        if (fetchedUUID != null) {
          final existing = ref
              .read(chatListProvider)
              .chats
              .any((c) => c.uuid == fetchedUUID);
          if (existing) {
            setSelectedChatUUID(fetchedUUID, subOverride: subOverride);
            return;
          }
        }

        state = state.copyWith(
          activeRemoteChatData: () => fetchedChat,
          selectedSub: subOverride ?? 0,
        );
      }
    } catch (e) {
      debugPrint('ActiveChatStore setSelectedHandle error: $e');
    }
  }

  void setSelectedSub(int sub) {
    state = state.copyWith(selectedSub: sub);
    final activeUUID = state.selectedChatUUID;
    if (activeUUID != null) {
      ref.read(chatDraftProvider(activeUUID).notifier).setSelectedSub(sub);
    }
  }

  void setContentView(String view) {
    state = state.copyWith(contentView: view);
    final activeUUID = state.selectedChatUUID;
    if (activeUUID != null) {
      ref.read(chatDraftProvider(activeUUID).notifier).setContentView(view);
    }
  }

  void setHeaderHeight(double height) {
    state = state.copyWith(headerHeight: height);
  }

  void setScrollToMessageID(String? id) {
    state = state.copyWith(scrollToMessageID: () => id);
  }

  void setMessageHighlight(String? target) {
    state = state.copyWith(messageHighlight: () => target);
  }

  void clear() {
    state = const ActiveChatState();
  }
}

/// Provider for global [ActiveChatNotifier].
final activeChatProvider =
    NotifierProvider<ActiveChatNotifier, ActiveChatState>(
      ActiveChatNotifier.new,
    );

/// Derived provider returning the active [ChatModel] if local, or a synthetic [ChatModel] if remote.
final activeChatDataProvider = Provider<ChatModel?>((ref) {
  final activeState = ref.watch(activeChatProvider);
  final activeUUID = activeState.selectedChatUUID;

  if (activeUUID != null) {
    return ref.watch(chatProvider(activeUUID));
  }

  if (activeState.activeRemoteChatData != null) {
    return ChatModel.fromMap(activeState.activeRemoteChatData!);
  }

  return null;
});

/// Derived provider returning the draft UI state of the currently active chat.
final activeChatDraftProvider = Provider<ChatDraftState>((ref) {
  final activeUUID = ref.watch(
    activeChatProvider.select((s) => s.selectedChatUUID),
  );
  if (activeUUID == null) return const ChatDraftState();
  return ref.watch(chatDraftProvider(activeUUID));
});
