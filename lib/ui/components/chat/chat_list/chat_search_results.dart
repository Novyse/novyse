import 'package:flutter/material.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_search_section_header.dart';
import 'package:novyse/ui/components/chat/chat_list/message_search_tile.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';

class ChatSearchResults extends StatelessWidget {
  const ChatSearchResults({
    super.key,
    required this.matchedChats,
    required this.matchedMessages,
    required this.messagesLoading,
    required this.query,
    required this.selectedChatUUID,
    required this.onOpenChat,
    required this.onOpenMessage,
  });

  final List<ChatModel> matchedChats;
  final List<Map<String, dynamic>> matchedMessages;
  final bool messagesLoading;
  final String query;
  final String? selectedChatUUID;
  final ValueChanged<String> onOpenChat;
  final ValueChanged<Map<String, dynamic>> onOpenMessage;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    const emptyPadding = EdgeInsets.fromLTRB(16, 12, 16, 4);

    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: ChatSearchSectionHeader(title: l10n.searchChats),
        ),
        if (matchedChats.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: emptyPadding,
              child: Text(
                l10n.searchNoResults,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
            sliver: SliverList.separated(
              itemCount: matchedChats.length,
              separatorBuilder: (_, _) => const SizedBox(height: 4),
              itemBuilder: (context, index) {
                final chat = matchedChats[index];
                return ChatListItem(
                  chat: chat,
                  isSelected: selectedChatUUID == chat.uuid,
                  onTap: () => onOpenChat(chat.uuid),
                );
              },
            ),
          ),
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        SliverToBoxAdapter(
          child: ChatSearchSectionHeader(title: l10n.searchMessages),
        ),
        if (messagesLoading)
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
          )
        else if (matchedMessages.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: emptyPadding,
              child: Text(
                query.length < 2 ? '...' : l10n.searchNoResults,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 96),
            sliver: SliverList.separated(
              itemCount: matchedMessages.length,
              separatorBuilder: (_, _) => const SizedBox(height: 4),
              itemBuilder: (context, index) {
                final result = matchedMessages[index];
                return MessageSearchTile(
                  result: result,
                  query: query,
                  onTap: () => onOpenMessage(result),
                );
              },
            ),
          ),
      ],
    );
  }
}
