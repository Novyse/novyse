import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/permissions.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/message/action_menu/message_action_menu.dart';
import 'package:novyse/ui/components/chat/message/message_system.dart';
import 'package:novyse/ui/components/chat/message_list_item.dart';
import 'package:novyse/ui/components/chat/message_list_scroller.dart';
import 'package:novyse/ui/components/chat/message_read_tracker.dart';

class MessageList extends ConsumerStatefulWidget {
  const MessageList({
    super.key,
    required this.chatUUID,
    this.subID = 0,
    this.scrollController,
    this.searchQuery = '',
    this.highlightedMessageId,
  });

  final String chatUUID;
  final int subID;
  final ScrollController? scrollController;
  final String searchQuery;
  final dynamic highlightedMessageId;

  @override
  ConsumerState<MessageList> createState() => _MessageListState();
}

class _MessageListState extends ConsumerState<MessageList>
    with MessageReadTracker, MessageListScroller {
  final Map<String, GlobalKey> _itemKeys = {};
  late final ScrollController _internalController;

  @override
  Map<String, GlobalKey> get itemKeys => _itemKeys;

  @override
  ScrollController get effectiveController =>
      widget.scrollController ?? _internalController;

  @override
  String get chatUUID => widget.chatUUID;

  @override
  int get subID => widget.subID;

  @override
  dynamic get highlightedMessageId => widget.highlightedMessageId;

  @override
  void initState() {
    super.initState();
    _internalController = ScrollController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final chatUUID = widget.chatUUID;
      final subID = widget.subID;
      ref
          .read(
            chatMessagesProvider((chatUUID: chatUUID, subID: subID)).notifier,
          )
          .init()
          .then((_) => anchorToFirstUnread(chatUUID, subID));
      scrollToHighlighted();
    });
  }

  @override
  void dispose() {
    _internalController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant MessageList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID ||
        oldWidget.subID != widget.subID) {
      _itemKeys.clear();
      resetUnreadAnchor();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          final chatUUID = widget.chatUUID;
          final subID = widget.subID;
          ref
              .read(
                chatMessagesProvider((chatUUID: chatUUID, subID: subID))
                    .notifier,
              )
              .init()
              .then((_) => anchorToFirstUnread(chatUUID, subID));
        }
      });
    } else if (oldWidget.highlightedMessageId?.toString() !=
        widget.highlightedMessageId?.toString()) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) scrollToHighlighted();
      });
    }
  }

  void _openContextMenu(
    MessageModel msg,
    Offset position,
    String? selectedText,
  ) {
    MessageActionMenu.show(
      context: context,
      position: position,
      message: msg,
      selectedText: selectedText,
    );
  }

  @override
  Widget build(BuildContext context) {
    final chatUUID = widget.chatUUID;
    final subID = widget.subID;
    final chat = ref.watch(chatProvider(chatUUID));

    ref.listen<(String?, int?, int?)>(
      activeChatProvider.select(
        (s) => (s.scrollToMessageID, s.scrollToRangeStart, s.scrollToRangeEnd),
      ),
      (previous, next) {
        final id = next.$1;
        if (id != null && id.isNotEmpty) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              handleScrollTarget(id, rangeStart: next.$2, rangeEnd: next.$3);
            }
          });
        }
      },
    );

    final messagesState = ref.watch(
      chatMessagesProvider((chatUUID: chatUUID, subID: subID)),
    );
    final messages = messagesState.messages;
    // A new newest-message only triggers a visibility pass: it is marked
    // solely when actually displayed (e.g. user at the bottom), never blindly.
    ref.listen<String?>(
      chatMessagesProvider((chatUUID: chatUUID, subID: subID)).select(
        (state) =>
            state.messages.isEmpty ? null : state.messages.first.id.toString(),
      ),
      (previous, next) {
        if (next != null && next != previous) {
          // Sending a message dismisses the unread divider
          final local = ref.read(
            userStoreProvider.select((s) => s.localUserUUID),
          );
          final newest = ref
              .read(chatMessagesProvider((chatUUID: chatUUID, subID: subID)))
              .messages
              .firstOrNull;
          if (local.isNotEmpty && newest != null && newest.userUUID == local) {
            dismissUnreadDivider();
          }
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) markVisibleAsRead(chatUUID, subID);
          });
        }
      },
    );
    // Builder index of the unread divider (list is newest-first, so the
    // divider sits right above the first unread, toward the older side).
    var dividerAt = -1;
    if (firstUnreadId != null) {
      final k = messages.indexWhere(
        (m) => m.id.toString() == firstUnreadId.toString(),
      );
      if (k >= 0) dividerAt = k + 1;
    }
    if (messagesState.loading && messages.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final localUserUUID = ref.watch(
      userStoreProvider.select((s) => s.localUserUUID),
    );
    final users = ref.watch(userStoreProvider.select((s) => s.users));

    final draftState = ref.watch(chatDraftProvider(chatUUID));
    final selectedMessages = draftState.selectedMessages;
    final isSelectionMode = selectedMessages.isNotEmpty;

    final isDM = chat?.type == 'DM';
    final isGroup = chat != null && !isDM;
    final sub = chat?.subs.where((s) => s['id'] == subID).firstOrNull;
    final subType = sub?['type'] as String?;
    final myMember = chat?.members
        .where((m) => m['uuid'] == localUserUUID)
        .firstOrNull;
    final myRoleIDs = (myMember?['roleIDs'] as List?) ?? const [];
    final myRoles = (chat?.roles ?? [])
        .where((r) => myRoleIDs.contains(r['id']))
        .toList();
    final canReplyChat =
        isDM ||
        chat == null ||
        hasPermission(myRoles, ChatPermissions.sendMessage, subType);

    return NotificationListener<ScrollNotification>(
      onNotification: onScrollNotification,
      child: ListView.builder(
        key: listKey,
        controller: effectiveController,
        reverse: true,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        itemCount: messages.length + (dividerAt >= 0 ? 1 : 0),
        itemBuilder: (context, index) {
          if (dividerAt >= 0 && index == dividerAt) {
            return KeyedSubtree(
              key: unreadDividerKey,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: MessageSystem(
                  type: 'separator-with-lines',
                  data: context.l10n.unreadMessages,
                ),
              ),
            );
          }
          final message =
              messages[dividerAt >= 0 && index > dividerAt ? index - 1 : index];
          final isSender = message.userUUID == localUserUUID;
          final senderUser = users[message.userUUID];
          final isSearchMatch =
              widget.highlightedMessageId != null &&
              message.id.toString() == widget.highlightedMessageId.toString();
          final isJumpMatch =
              jumpHighlightedMessageId != null &&
              message.id.toString() == jumpHighlightedMessageId.toString();
          final isCurrentMatch = isSearchMatch || isJumpMatch;

          final isMsgSelected =
              isCurrentMatch ||
              selectedMessages.any(
                (m) => m.id.toString() == message.id.toString(),
              );

          final itemKey = _itemKeys.putIfAbsent(
            message.id.toString(),
            () => GlobalKey(),
          );

          final quoteHighlightRange =
              isJumpMatch && jumpRangeStart != null && jumpRangeEnd != null
              ? TextRange(start: jumpRangeStart!, end: jumpRangeEnd!)
              : null;

          return MessageListItem(
            itemKey: itemKey,
            message: message,
            isSender: isSender,
            isSelected: isMsgSelected,
            isSelectionMode: isSelectionMode,
            showAvatar: isGroup && !isSender,
            showSenderName: isGroup && !isSender,
            senderUser: senderUser,
            searchHighlight: widget.searchQuery,
            isCurrentSearchMatch: isCurrentMatch,
            quoteHighlightRange: quoteHighlightRange,
            canReply: canReplyChat,
            onReply: () {
              ref.read(chatDraftProvider(chatUUID).notifier).addReply(message);
            },
            onReplyTap:
                ({
                  required String chatUUID,
                  required int subID,
                  required int messageID,
                  int? rangeStart,
                  int? rangeEnd,
                }) {
                  if (chatUUID.isEmpty || chatUUID == widget.chatUUID) {
                    ref
                        .read(activeChatProvider.notifier)
                        .jumpToMessage(
                          messageID,
                          subID: subID,
                          rangeStart: rangeStart,
                          rangeEnd: rangeEnd,
                        );
                  }
                },
            onSelectionToggle: () {
              ref
                  .read(chatDraftProvider(chatUUID).notifier)
                  .toggleSelectMessage(message);
            },
            onOpenContextMenu: (position, selectedText) {
              _openContextMenu(message, position, selectedText);
            },
            getMessage: (lookupChatUUID, lookupSubID, lookupMessageID) {
              try {
                final state = ref.read(
                  chatMessagesProvider((
                    chatUUID: lookupChatUUID,
                    subID: lookupSubID,
                  )),
                );
                return state.messages.firstWhere(
                  (m) => m.id == lookupMessageID,
                  orElse: () => throw Exception('Message not found'),
                );
              } catch (_) {
                return null;
              }
            },
            getUser: (uuid) => users[uuid],
          );
        },
      ),
    );
  }
}
