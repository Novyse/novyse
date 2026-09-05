import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/message/message_base.dart';

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

  void _scrollToHighlighted() {
    if (widget.highlightedMessageId == null) return;
    _scrollAttempts = 0;
    _attemptScroll();
  }

  void _attemptScroll() {
    final id = widget.highlightedMessageId;
    if (id == null || !mounted) return;
    final key = _itemKeys[id.toString()];
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
        _scheduleRetry();
      }
      return;
    }
    _scrollTowardTarget(id.toString());
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
      _scheduleRetry();
      return;
    }
    final controller = _effectiveController;
    if (!controller.hasClients) {
      _scheduleRetry();
      return;
    }
    final max = controller.position.maxScrollExtent;
    if (max <= 0) {
      _scheduleRetry();
      return;
    }
    final target = (max * (index / messages.length)).clamp(0.0, max);
    controller
        .animateTo(
          target,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeInOut,
        )
        .then((_) => _scheduleRetry())
        .catchError((_) => _scheduleRetry());
  }

  void _scheduleRetry() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _attemptScroll();
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatUUID = widget.chatUUID;
    final subID = widget.subID;
    final chat = ref.watch(chatProvider(chatUUID));

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

    final isGroup = chat != null && chat.type != 'DM';

    return ListView.builder(
      controller: _effectiveController,
      reverse: true,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[index];
        final isSender = message.userUUID == localUserUUID;
        final senderUser = users[message.userUUID];
        final isCurrentMatch =
            widget.highlightedMessageId != null &&
            message.id.toString() == widget.highlightedMessageId.toString();
        final itemKey = _itemKeys.putIfAbsent(
          message.id.toString(),
          () => GlobalKey(),
        );

        return KeyedSubtree(
          key: itemKey,
          child: MessageBase(
            message: message,
            isSender: isSender,
            isSelected: isCurrentMatch,
            showAvatar: isGroup && !isSender,
            showSenderName: isGroup && !isSender,
            senderUser: senderUser,
            searchHighlight: widget.searchQuery,
            isCurrentSearchMatch: isCurrentMatch,
            getMessage: (chatUUID, subID, messageID) {
              // Look up message from the store
              try {
                final state = ref.read(
                  chatMessagesProvider((chatUUID: chatUUID, subID: subID)),
                );
                return state.messages.firstWhere(
                  (m) => m.id == messageID,
                  orElse: () => throw Exception('Message not found'),
                );
              } catch (_) {
                return null;
              }
            },
            getUser: (uuid) => users[uuid],
          ),
        );
      },
    );
  }
}
