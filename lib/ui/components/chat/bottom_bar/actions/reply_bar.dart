import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/huge_icon.dart';

import 'package:novyse/core/stores/user_store.dart';

class ReplyBar extends ConsumerWidget {
  const ReplyBar({super.key, required this.chatUUID});

  final String chatUUID;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final replyingTo = ref.watch(chatDraftProvider(chatUUID)).replyingTo;
    if (replyingTo.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final users = ref.watch(userStoreProvider.select((s) => s.users));

    void handleCancelReply(ChatReplyItem item) {
      ref
          .read(chatDraftProvider(chatUUID).notifier)
          .removeReply(item.message.id);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.4),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: replyingTo.map((item) {
          final message = item.message;
          final senderName = users[message.userUUID]?.name ?? message.userUUID;
          var content = message.content ?? '';

          if (item.isQuote && content.isNotEmpty) {
            final start = item.rangeStart!.clamp(0, content.length);
            final end = item.rangeEnd!.clamp(start, content.length);
            content = content.substring(start, end);
          }

          return Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    AppHugeIcon(
                      icon: item.isQuote
                          ? HugeIcons.strokeRoundedArrowMoveUpLeft
                          : HugeIcons.strokeRoundedArrowMoveUpLeft,
                      size: 18,
                      color: colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 3,
                      height: 24,
                      decoration: BoxDecoration(
                        color: colorScheme.primary,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            senderName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: colorScheme.onSurface,
                            ),
                          ),
                          Text(
                            content,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              InkWell(
                onTap: () => handleCancelReply(item),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: AppHugeIcon(
                    icon: HugeIcons.strokeRoundedCancel01,
                    size: 16,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }
}
