import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_pinned_messages_bar.dart';

/// General unified sub-header bar displayed directly under the main floating header.
class ChatSubHeader extends ConsumerWidget {
  const ChatSubHeader({super.key, required this.chatUUID});

  final String chatUUID;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chat = ref.watch(chatProvider(chatUUID));
    if (chat == null) return const SizedBox.shrink();

    final hasPinnedMessages = chat.pinnedMessages.isNotEmpty;
    if (!hasPinnedMessages) return const SizedBox.shrink();

    final colorScheme = Theme.of(context).colorScheme;

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: colorScheme.surface.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.25),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (hasPinnedMessages) ChatPinnedMessagesBar(chatUUID: chatUUID),
              // CommsBar here
              // AudioActiveBar here
            ],
          ),
        ),
      ),
    );
  }
}
