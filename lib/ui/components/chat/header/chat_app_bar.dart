import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/pages/app/chat_routes.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';

class ChatAppBar extends ConsumerWidget implements PreferredSizeWidget {
  const ChatAppBar({super.key, required this.chatUUID});

  final String chatUUID;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final chat = ref.watch(chatProvider(chatUUID));

    if (chat == null) {
      return AppBar(
        title: Text(l10n.chatTitle),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => popOrChats(context),
        ),
      );
    }

    final localUserUUID = ref.watch(
      userStoreProvider.select((s) => s.localUserUUID),
    );
    final users = ref.watch(userStoreProvider.select((s) => s.users));
    final metadata = resolveChatMetadata(
      chat: chat,
      localUserUUID: localUserUUID,
      users: users,
      l10n: l10n,
    );

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    String subtitleText;
    if (metadata.isSavedMessages) {
      subtitleText = '';
    } else if (chat.type == 'DM') {
      subtitleText = metadata.isOnline ? l10n.online : l10n.offline;
    } else {
      subtitleText = l10n.membersCount(chat.members.length);
    }

    return AppBar(
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => popOrChats(context),
      ),
      titleSpacing: 0,
      title: Row(
        children: [
          Avatar(
            uuid: metadata.profilePictureUUID,
            name: metadata.name,
            seedKey: chatUUID,
            size: 40,
            isOnline: metadata.isOnline,
            isSavedMessages: metadata.isSavedMessages,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  metadata.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (subtitleText.isNotEmpty)
                  Text(
                    subtitleText,
                    style: TextStyle(
                      fontSize: 12,
                      color: metadata.isOnline
                          ? colorScheme.primary
                          : colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
