import 'package:flutter/material.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';

class ChatListView extends StatelessWidget {
  const ChatListView({
    super.key,
    required this.chats,
    required this.selectedChatUUID,
    required this.onOpenChat,
  });

  final List<ChatModel> chats;
  final String? selectedChatUUID;
  final ValueChanged<String> onOpenChat;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 96),
      sliver: SliverList.separated(
        itemCount: chats.length,
        separatorBuilder: (_, _) => const SizedBox(height: 4),
        itemBuilder: (context, index) {
          final chat = chats[index];
          return ChatListItem(
            chat: chat,
            isSelected: selectedChatUUID == chat.uuid,
            onTap: () => onOpenChat(chat.uuid),
          );
        },
      ),
    );
  }
}
