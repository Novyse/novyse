import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/status_store.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';
import 'package:novyse/ui/components/status/global_status_bar.dart';

class ChatListPage extends ConsumerWidget {
  const ChatListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final selectedChatId = GoRouterState.of(context).pathParameters['chatId'];
    final activeStatus = ref.watch(activeStatusProvider);
    final chatListState = ref.watch(chatListProvider);
    final chats = chatListState.chats;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat'),
        bottom: activeStatus != null
            ? const GlobalStatusBar(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              )
            : null,
      ),
      body: chatListState.loading && chats.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : chats.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.chat_bubble_outline_rounded,
                    size: 64,
                    color: Theme.of(context).colorScheme.outline
                        .withValues(alpha: 0.4),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    l10n.noChats,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 96),
              itemCount: chats.length,
              separatorBuilder: (_, _) => const SizedBox(height: 4),
              itemBuilder: (context, index) {
                final chat = chats[index];
                final selected = selectedChatId == chat.uuid;

                return ChatListItem(
                  chat: chat,
                  isSelected: selected,
                  onTap: () => context.go('/chats/${chat.uuid}'),
                );
              },
            ),
    );
  }
}
