import 'package:hugeicons/hugeicons.dart';
import 'package:material_ui/material_ui.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';
import 'package:novyse/ui/components/huge_icon.dart';

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
    this.onReorderPinned,
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

  /// Called when a pinned chat is dropped at a new position. The indices refer
  /// to [chats]; only the pinned chats can be dragged.
  final void Function(int oldIndex, int newIndex)? onReorderPinned;

  @override
  Widget build(BuildContext context) {
    final canReorder =
        onReorderPinned != null && chats.any((chat) => chat.isPinned);

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 96),
      sliver: canReorder
          ? SliverReorderableList(
              itemCount: chats.length,
              onReorderItem: onReorderPinned!,
              itemBuilder: (context, index) {
                final pinned = chats[index].isPinned;
                return Padding(
                  key: ValueKey(chats[index].uuid),
                  padding: EdgeInsets.only(
                    bottom: index == chats.length - 1 ? 0 : 4,
                  ),
                  child: _buildItem(
                    context,
                    index,
                    dragHandle: pinned && selectionMode
                        ? _buildDragHandle(context, index)
                        : null,
                  ),
                );
              },
            )
          : SliverList.separated(
              itemCount: chats.length,
              separatorBuilder: (_, _) => const SizedBox(height: 4),
              itemBuilder: (context, index) => _buildItem(context, index),
            ),
    );
  }

  /// The two bars that mark a pinned chat as movable in selection mode; holding
  /// them starts the drag, while the long press keeps selecting the chat.
  Widget _buildDragHandle(BuildContext context, int index) {
    return ReorderableDragStartListener(
      index: index,
      child: Padding(
        padding: const EdgeInsets.only(left: 6),
        child: AppHugeIcon(
          icon: HugeIcons.strokeRoundedMenuTwoLine,
          size: 18,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }

  Widget _buildItem(BuildContext context, int index, {Widget? dragHandle}) {
    final chat = chats[index];

    return ChatListItem(
      chat: chat,
      isSelected: selectedChatUUID == chat.uuid,
      selectionMode: selectionMode,
      selectionSelected: selectedUUIDs.contains(chat.uuid),
      trailing: dragHandle,
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
  }
}
