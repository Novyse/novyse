import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';

import 'package:go_router/go_router.dart';
import 'package:novyse/core/chat/message_action_methods.dart';
import 'package:novyse/core/chat/message_format.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/favorite_messages_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/pages/app/chat_routes.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Favorites (Preferiti / Favorite messages) for a single chat.
///
/// Shown from the chat overview (`_ActionsCard` → Preferiti).
/// Reads from the local SQLite `favorite_message` table (synced via
/// `/user/initialize`, `user:message:favorite:update` socket event and
/// `MESSAGE_FAVORITED/UNFAVORITED` delta-sync events).
class ChatFavoritesPage extends ConsumerStatefulWidget {
  const ChatFavoritesPage({
    super.key,
    required this.chatUUID,
    required this.subID,
  });

  final String chatUUID;
  final int subID;

  @override
  ConsumerState<ChatFavoritesPage> createState() => _ChatFavoritesPageState();
}

class _ChatFavoritesPageState extends ConsumerState<ChatFavoritesPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(favoriteMessagesProvider(widget.chatUUID).notifier).init();
    });
  }

  Future<void> _toggleFavorite(MessageModel message) async {
    final methods = MessageActionMethods(
      ref: ref,
      context: context,
      chatUUID: message.chatUUID,
      subID: message.subID,
    );
    await methods.favorite(message);
  }

  void _openMessage(MessageModel message) {
    final chatUUID = message.chatUUID;
    if (chatUUID.isEmpty) return;
    final subID = message.subID;
    final messageID = message.id.toString();

    final notifier = ref.read(activeChatProvider.notifier);
    notifier.setSelectedChatUUID(chatUUID, subOverride: subID);
    if (messageID.isNotEmpty) {
      notifier.jumpToMessage(messageID, subID: subID);
      notifier.setMessageHighlight(messageID);
    }
    final currentPath = GoRouterState.of(context).uri.path;
    final target = chatSubPath(chatUUID, subID);
    if (currentPath == target) return;
    context.push(target);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final state = ref.watch(favoriteMessagesProvider(widget.chatUUID));

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowLeft01),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text(l10n.favoriteMessages),
      ),
      body: Builder(
        builder: (context) {
          if (state.loading && state.favorites.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.favorites.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.star_border,
                    size: 44,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.noFavoriteMessages,
                    style: TextStyle(
                      fontSize: 13,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref
                .read(favoriteMessagesProvider(widget.chatUUID).notifier)
                .reload(),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              itemCount: state.favorites.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final message = state.favorites[index];
                return _FavoriteRow(
                  message: message,
                  onToggle: () => _toggleFavorite(message),
                  onTap: () => _openMessage(message),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _FavoriteRow extends StatelessWidget {
  const _FavoriteRow({
    required this.message,
    required this.onToggle,
    required this.onTap,
  });

  final MessageModel message;
  final VoidCallback onToggle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final content = (message.content ?? '').trim();
    final preview = content.isEmpty ? '—' : content;
    final timeFormatted = formatMessageDateTime(message.createdAt, l10n: l10n);
    final subtitleText = message.subID > 0
        ? '#${message.subID} · $timeFormatted'
        : timeFormatted;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.15)),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(Icons.star, color: colorScheme.primary, size: 20),
        ),
        title: Text(
          preview,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
        subtitle: Text(
          subtitleText,
          style: TextStyle(
            fontSize: 12,
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        trailing: IconButton(
          tooltip: MaterialLocalizations.of(context).deleteButtonTooltip,
          icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedStarOff),
          onPressed: onToggle,
        ),
      ),
    );
  }
}
