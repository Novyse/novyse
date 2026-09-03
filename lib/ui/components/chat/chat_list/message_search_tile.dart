import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';

class MessageSearchTile extends ConsumerWidget {
  const MessageSearchTile({
    super.key,
    required this.result,
    required this.query,
    this.onTap,
  });

  final Map<String, dynamic> result;
  final String query;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chatUUID = result['chatUUID']?.toString() ?? '';
    final chat = ref.watch(chatProvider(chatUUID));
    final l10n = AppLocalizations.of(context)!;
    final userState = ref.watch(userStoreProvider);
    final users = userState.users;

    final chatName = chat == null
        ? l10n.chatUnknown
        : resolveChatMetadata(
            chat: chat,
            localUserUUID: userState.localUserUUID,
            users: users,
            l10n: l10n,
          ).name;

    final senderUUID = result['senderUUID']?.toString() ?? '';
    final senderName =
        users[senderUUID]?.displayName.trim().isNotEmpty == true
        ? users[senderUUID]!.displayName.trim()
        : (result['sender_name']?.toString().isNotEmpty == true
              ? result['sender_name'].toString()
              : l10n.chatUnknown);
    final content = (result['content']?.toString() ?? '').replaceAll('\n', ' ');
    final timeStr = _formatTime(result['created_at'] ?? result['createdAt']);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Avatar(
                uuid: chat?.profilePictureUUID,
                name: chatName,
                seedKey: chatUUID.isNotEmpty ? chatUUID : chatName,
                size: 44,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            chatName,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (timeStr.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(left: 8),
                            child: Text(
                              timeStr,
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      senderName,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text.rich(
                      _highlightSnippet(content, query, context),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 13.5,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(dynamic raw) {
    if (raw == null) return '';
    final dt = DateTime.tryParse(raw.toString())?.toLocal();
    if (dt == null) return '';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final date = DateTime(dt.year, dt.month, dt.day);
    if (date == today) {
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    }
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }

  TextSpan _highlightSnippet(
    String text,
    String query,
    BuildContext context,
  ) {
    if (query.isEmpty) return TextSpan(text: text);
    final lower = text.toLowerCase();
    final needle = query.toLowerCase();
    final spans = <TextSpan>[];
    var start = 0;
    while (true) {
      final index = lower.indexOf(needle, start);
      if (index < 0) {
        spans.add(TextSpan(text: text.substring(start)));
        break;
      }
      if (index > start) {
        spans.add(TextSpan(text: text.substring(start, index)));
      }
      spans.add(
        TextSpan(
          text: text.substring(index, index + needle.length),
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.onSurface,
            backgroundColor: Theme.of(
              context,
            ).colorScheme.primary.withValues(alpha: 0.18),
          ),
        ),
      );
      start = index + needle.length;
    }
    return TextSpan(children: spans);
  }
}
