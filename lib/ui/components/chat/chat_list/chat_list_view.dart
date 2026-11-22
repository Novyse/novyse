import 'package:material_ui/material_ui.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';

class ChatListView extends StatelessWidget {
  const ChatListView({
    super.key,
    required this.chats,
    required this.selectedChatUUID,
    required this.onOpenChat,
    this.selectionMode = false,
    this.selectedUUIDs = const {},
    this.onToggleSelection,
    this.onEnterSelection,
    this.onSecondaryTapItem,
  });

  final List<ChatModel> chats;
  final String? selectedChatUUID;
  final ValueChanged<String> onOpenChat;

  final bool selectionMode;

  final Set<String> selectedUUIDs;

  final ValueChanged<String>? onToggleSelection;

  final ValueChanged<String>? onEnterSelection;

  final void Function(String chatUUID, Offset globalPosition)?
  onSecondaryTapItem;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 96),
      sliver: SliverList.separated(
        itemCount: chats.length,
        separatorBuilder: (_, _) => const SizedBox(height: 4),
        itemBuilder: (context, index) {
          final chat = chats[index];
          return ChatListItem(
            chat: chat,
            isSelected: selectedChatUUID == chat.uuid,
            selectionMode: selectionMode,
            selectionSelected: selectedUUIDs.contains(chat.uuid),
            onTap: () {
              if (selectionMode) {
                onToggleSelection?.call(chat.uuid);
              } else {
                onOpenChat(chat.uuid);
              }
            },
            onLongPress: () {
              if (selectionMode) {
                onToggleSelection?.call(chat.uuid);
              } else {
                onEnterSelection?.call(chat.uuid);
              }
            },
            onSecondaryTapUp: (details) =>
                onSecondaryTapItem?.call(chat.uuid, details.globalPosition),
          );
        },
      ),
    );
  }
}
