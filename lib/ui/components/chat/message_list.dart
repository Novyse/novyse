import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:novyse/core/chat/chat_permission_helpers.dart';
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
    this.bottomInset = 12,
  });

  final String chatUUID;
  final int subID;
  final ScrollController? scrollController;
  final String searchQuery;
  final dynamic highlightedMessageId;

  /// Spazio interno in basso alla lista (dentro lo scrollable) così
  /// l'ultimo messaggio può risalire sopra la bottombar flottante,
  /// ma scorrendo i messaggi passano comunque sotto (overlay, non push).
  /// Aggiornato dalla pagina via misura della bottombar (altezza variabile).
  final double bottomInset;

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
    final canReplyChat = ChatPermissionHelpers.canUserSendMessage(
      chat,
      localUserUUID,
      subID: subID,
    );

    // Build flat list of entries for newest-first (reverse: true) ListView.
    // 1) Messages
    // 2) Unread messages divider
    // 3) Date separator pill
    final items = <_MessageListItemEntry>[];
    for (var i = 0; i < messages.length; i++) {
      final msg = messages[i];
      items.add(_MessageItemEntry(msg));

      if (firstUnreadId != null &&
          msg.id.toString() == firstUnreadId.toString()) {
        items.add(const _UnreadDividerEntry());
      }

      final msgDate = msg.createdAt.toLocal();
      final isFirstOfDay = (i == messages.length - 1) ||
          !_isSameDay(msgDate, messages[i + 1].createdAt.toLocal());
      if (isFirstOfDay) {
        items.add(_DateSeparatorEntry(msgDate));
      }
    }

    return NotificationListener<ScrollNotification>(
      onNotification: onScrollNotification,
      child: ListView.builder(
        key: listKey,
        controller: effectiveController,
        reverse: true,
        padding: EdgeInsets.fromLTRB(12, 12, 12, widget.bottomInset),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final entry = items[index];
          switch (entry) {
            case _UnreadDividerEntry():
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
            case _DateSeparatorEntry(date: final date):
              final localeName = context.l10n.localeName;
              String dateStr;
              try {
                dateStr = DateFormat.yMd(localeName).format(date);
              } catch (_) {
                dateStr = DateFormat('dd/MM/yyyy').format(date);
              }
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: MessageSystem(
                  key: ValueKey('date_${date.year}_${date.month}_${date.day}'),
                  type: 'date',
                  data: dateStr,
                ),
              );
            case _MessageItemEntry(message: final message):
              final isSender = message.userUUID == localUserUUID;
              final senderUser = users[message.userUUID];
              final isSearchMatch =
                  widget.highlightedMessageId != null &&
                  message.id.toString() ==
                      widget.highlightedMessageId.toString();
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
                  ref
                      .read(chatDraftProvider(chatUUID).notifier)
                      .addReply(message);
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
          }
        },
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}

sealed class _MessageListItemEntry {
  const _MessageListItemEntry();
}

class _MessageItemEntry extends _MessageListItemEntry {
  final MessageModel message;
  const _MessageItemEntry(this.message);
}

class _DateSeparatorEntry extends _MessageListItemEntry {
  final DateTime date;
  const _DateSeparatorEntry(this.date);
}

class _UnreadDividerEntry extends _MessageListItemEntry {
  const _UnreadDividerEntry();
}
