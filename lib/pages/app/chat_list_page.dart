import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/stores/status_store.dart';
import '../../ui/components/status/global_status_bar.dart';
import 'chat_catalog.dart';

class ChatListPage extends ConsumerWidget {
  const ChatListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedChatId = GoRouterState.of(context).pathParameters['chatId'];
    final activeStatus = ref.watch(activeStatusProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat'),
        bottom: activeStatus != null
            ? const GlobalStatusBar(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              )
            : null,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
        itemCount: ChatCatalog.chats.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final chat = ChatCatalog.chats[index];
          final selected = selectedChatId == chat.id;

          return ListTile(
            selected: selected,
            selectedTileColor: Theme.of(context).colorScheme.primaryContainer
                .withValues(alpha: 0.28),
            leading: CircleAvatar(
              radius: 24,
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              child: Text(
                chat.name.substring(0, 1),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            title: Text(
              chat.name,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: Text(chat.message),
            trailing: chat.unread > 0
                ? Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 7,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '${chat.unread}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  )
                : Text(chat.time, style: Theme.of(context).textTheme.bodySmall),
            onTap: () => context.go('/chats/${chat.id}'),
          );
        },
      ),
    );
  }
}
