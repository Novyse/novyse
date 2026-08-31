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
  });

  final String chatUUID;
  final int subID;
  final ScrollController? scrollController;

  @override
  ConsumerState<MessageList> createState() => _MessageListState();
}

class _MessageListState extends ConsumerState<MessageList> {
  @override
  void initState() {
    super.initState();
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
  }

  @override
  void didUpdateWidget(covariant MessageList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID ||
        oldWidget.subID != widget.subID) {
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
    }
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
      controller: widget.scrollController,
      reverse: true,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[index];
        final isSender = message.userUUID == localUserUUID;
        final senderUser = users[message.userUUID];

        return MessageBase(
          message: message,
          isSender: isSender,
          showAvatar: isGroup && !isSender,
          showSenderName: isGroup && !isSender,
          senderUser: senderUser,
        );
      },
    );
  }
}
