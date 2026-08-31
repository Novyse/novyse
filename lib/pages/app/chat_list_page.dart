import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';
import 'package:novyse/ui/components/status/global_status_bar.dart';

const _statusBarPadding = EdgeInsets.symmetric(horizontal: 16, vertical: 4);

class ChatListPage extends ConsumerWidget {
  const ChatListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final selectedChatUUID = ref.watch(
      activeChatProvider.select((s) => s.selectedChatUUID),
    );
    final chatListState = ref.watch(chatListProvider);
    final chats = chatListState.chats;
    final topInset = MediaQuery.paddingOf(context).top;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('Chat'),
        scrolledUnderElevation: 0,
      ),
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: SizedBox(height: topInset + kToolbarHeight),
              ),
              const SliverToBoxAdapter(
                child: Visibility(
                  visible: false,
                  maintainSize: true,
                  maintainAnimation: true,
                  maintainState: true,
                  child: GlobalStatusBar(padding: _statusBarPadding),
                ),
              ),
              if (chatListState.loading && chats.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (chats.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.chat_bubble_outline_rounded,
                          size: 64,
                          color: Theme.of(
                            context,
                          ).colorScheme.outline.withValues(alpha: 0.4),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          l10n.noChats,
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurfaceVariant,
                              ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 96),
                  sliver: SliverList.separated(
                    itemCount: chats.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 4),
                    itemBuilder: (context, index) {
                      final chat = chats[index];
                      final selected = selectedChatUUID == chat.uuid;

                      return ChatListItem(
                        chat: chat,
                        isSelected: selected,
                        onTap: () {
                          ref
                              .read(activeChatProvider.notifier)
                              .setSelectedChatUUID(chat.uuid);
                          context.go('/chats/${chat.uuid}');
                        },
                      );
                    },
                  ),
                ),
            ],
          ),
          Positioned(
            top: topInset + kToolbarHeight,
            left: 0,
            right: 0,
            child: const GlobalStatusBar(padding: _statusBarPadding),
          ),
        ],
      ),
    );
  }
}
