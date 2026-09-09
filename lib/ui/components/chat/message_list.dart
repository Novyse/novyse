import 'dart:async' show Timer;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/permissions.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/message/action_menu/message_action_menu.dart';
import 'package:novyse/ui/components/chat/message/message_base.dart';
import 'package:novyse/ui/components/chat/message/swipe_to_reply.dart';

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

class _MessageListState extends ConsumerState<MessageList> {
  final Map<String, GlobalKey> _itemKeys = {};
  late final ScrollController _internalController;
  int _scrollAttempts = 0;

  dynamic _jumpHighlightedMessageId;
  int? _jumpRangeStart;
  int? _jumpRangeEnd;
  Timer? _jumpHighlightTimer;

  ScrollController get _effectiveController =>
      widget.scrollController ?? _internalController;

  @override
  void initState() {
    super.initState();
    _internalController = ScrollController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref
            .read(
              chatMessagesProvider((
                chatUUID: widget.chatUUID,
                subID: widget.subID,
              )).notifier,
            )
            .init();
        _scrollToHighlighted();
      }
    });
  }

  @override
  void dispose() {
    _jumpHighlightTimer?.cancel();
    _internalController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant MessageList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID ||
        oldWidget.subID != widget.subID) {
      _itemKeys.clear();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ref
              .read(
                chatMessagesProvider((
                  chatUUID: widget.chatUUID,
                  subID: widget.subID,
                )).notifier,
              )
              .init();
        }
      });
    } else if (oldWidget.highlightedMessageId?.toString() !=
        widget.highlightedMessageId?.toString()) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _scrollToHighlighted();
      });
    }
  }

  void _jumpToMessage(dynamic messageId, {int? rangeStart, int? rangeEnd}) {
    _jumpHighlightTimer?.cancel();
    setState(() {
      _jumpHighlightedMessageId = messageId;
      _jumpRangeStart = rangeStart;
      _jumpRangeEnd = rangeEnd;
    });

    _scrollAttempts = 0;
    _attemptScrollTo(messageId.toString());

    _jumpHighlightTimer = Timer(const Duration(milliseconds: 2000), () {
      if (mounted) {
        setState(() {
          _jumpHighlightedMessageId = null;
          _jumpRangeStart = null;
          _jumpRangeEnd = null;
        });
      }
    });
  }

  void _scrollToHighlighted() {
    if (widget.highlightedMessageId == null) return;
    _scrollAttempts = 0;
    _attemptScrollTo(widget.highlightedMessageId.toString());
  }

  void _attemptScrollTo(String targetId) {
    if (!mounted) return;
    final key = _itemKeys[targetId];
    final itemContext = key?.currentContext;
    if (itemContext != null) {
      if (_scrollAttempts >= 25) return;
      try {
        Scrollable.ensureVisible(
          itemContext,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          alignment: 0.5,
        );
      } catch (_) {
        _scrollAttempts++;
        _scheduleRetry(targetId);
      }
      return;
    }
    _scrollTowardTarget(targetId);
  }

  void _scrollTowardTarget(String id) {
    if (_scrollAttempts >= 25 || !mounted) return;
    _scrollAttempts++;
    final messages = ref
        .read(
          chatMessagesProvider((
            chatUUID: widget.chatUUID,
            subID: widget.subID,
          )),
        )
        .messages;
    final index = messages.indexWhere((m) => m.id.toString() == id);
    if (index < 0 || messages.isEmpty) {
      _scheduleRetry(id);
      return;
    }
    final controller = _effectiveController;
    if (!controller.hasClients) {
      _scheduleRetry(id);
      return;
    }
    final max = controller.position.maxScrollExtent;
    if (max <= 0) {
      _scheduleRetry(id);
      return;
    }
    final target = (max * (index / messages.length)).clamp(0.0, max);
    controller
        .animateTo(
          target,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeInOut,
        )
        .then((_) => _scheduleRetry(id))
        .catchError((_) => _scheduleRetry(id));
  }

  void _scheduleRetry(String targetId) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _attemptScrollTo(targetId);
    });
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
      (previous, next) async {
        final id = next.$1;
        if (id != null && id.isNotEmpty) {
          final notifier = ref.read(
            chatMessagesProvider((
              chatUUID: widget.chatUUID,
              subID: widget.subID,
            )).notifier,
          );
          await notifier.fetchMessageById(id);
          if (mounted) {
            _jumpToMessage(id, rangeStart: next.$2, rangeEnd: next.$3);
            ref.read(activeChatProvider.notifier).clearScrollTarget();
          }
        }
      },
    );

    final messagesState = ref.watch(
      chatMessagesProvider((chatUUID: chatUUID, subID: subID)),
    );
    final messages = messagesState.messages;

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

    return ListView.builder(
      controller: _effectiveController,
      reverse: true,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[index];
        final isSender = message.userUUID == localUserUUID;
        final senderUser = users[message.userUUID];
        final isSearchMatch =
            widget.highlightedMessageId != null &&
            message.id.toString() == widget.highlightedMessageId.toString();
        final isJumpMatch =
            _jumpHighlightedMessageId != null &&
            message.id.toString() == _jumpHighlightedMessageId.toString();
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
            isJumpMatch && _jumpRangeStart != null && _jumpRangeEnd != null
            ? TextRange(start: _jumpRangeStart!, end: _jumpRangeEnd!)
            : null;

        return KeyedSubtree(
          key: itemKey,
          child: SwipeToReply(
            enabled:
                !isSelectionMode && message.type != 'system' && canReplyChat,
            isSender: isSender,
            onReply: () {
              ref.read(chatDraftProvider(chatUUID).notifier).addReply(message);
            },
            child: MessageBase(
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
            ),
          ),
        );
      },
    );
  }
}
