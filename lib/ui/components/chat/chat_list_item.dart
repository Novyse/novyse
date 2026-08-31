import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/message_format.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';

/// Metadata resolved for displaying a chat header / list item.
class ResolvedChatMetadata {
  final String name;
  final String? profilePictureUUID;
  final bool isOnline;
  final bool isSavedMessages;
  final String? otherUserUUID;

  const ResolvedChatMetadata({
    required this.name,
    this.profilePictureUUID,
    this.isOnline = false,
    this.isSavedMessages = false,
    this.otherUserUUID,
  });
}

/// Resolves chat display name, avatar, and online status according to the application rules.
ResolvedChatMetadata resolveChatMetadata({
  required ChatModel chat,
  required String localUserUUID,
  required Map<String, UserModel> users,
  required AppLocalizations l10n,
}) {
  if (chat.type == 'DM') {
    final otherMembers = chat.members.where((m) {
      final uuid = (m['uuid'] ?? m['userUUID']) as String?;
      return uuid != null && uuid != localUserUUID;
    }).toList();

    // Only the local user in the DM -> "Saved Messages"
    if (chat.members.length <= 1 || otherMembers.isEmpty) {
      return ResolvedChatMetadata(
        name: l10n.savedMessages,
        profilePictureUUID: null,
        isOnline: false,
        isSavedMessages: true,
        otherUserUUID: localUserUUID,
      );
    }

    // Direct message with another participant
    final otherUUID =
        (otherMembers.first['uuid'] ?? otherMembers.first['userUUID'])
            as String?;
    final otherUser = otherUUID != null ? users[otherUUID] : null;

    final displayName = otherUser?.displayName.trim().isNotEmpty == true
        ? otherUser!.displayName.trim()
        : (otherUser?.handle?.isNotEmpty == true
              ? '@${otherUser!.handle}'
              : (chat.name.trim().isNotEmpty ? chat.name.trim() : 'User'));

    return ResolvedChatMetadata(
      name: displayName,
      profilePictureUUID: otherUser?.profilePictureUUID,
      isOnline: otherUser?.isOnline == true,
      isSavedMessages: false,
      otherUserUUID: otherUUID,
    );
  }

  // GROUP / CHANNEL / FORUM
  final displayName = chat.name.trim().isNotEmpty
      ? chat.name.trim()
      : (chat.handle?.isNotEmpty == true
            ? '@${chat.handle}'
            : (chat.type == 'CHANNEL' ? 'Channel' : 'Group'));

  final isAnyMemberOnline = chat.members.any((m) {
    final uuid = (m['uuid'] ?? m['userUUID']) as String?;
    return uuid != null && users[uuid]?.isOnline == true;
  });

  return ResolvedChatMetadata(
    name: displayName,
    profilePictureUUID: chat.profilePictureUUID,
    isOnline: isAnyMemberOnline,
    isSavedMessages: false,
  );
}

/// Chat List Item component connected to Riverpod stores and message formatting.
class ChatListItem extends ConsumerWidget {
  final ChatModel chat;
  final bool isSelected;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const ChatListItem({
    super.key,
    required this.chat,
    this.isSelected = false,
    this.onTap,
    this.onLongPress,
  });

  String _formatChatTime(ChatModel chat) {
    final msg = chat.lastMessage;
    final rawTime =
        msg?['createdAt'] ??
        msg?['created_at'] ??
        chat.createdAt?.toIso8601String();
    if (rawTime == null) return '';
    final dt = DateTime.tryParse(rawTime.toString())?.toLocal();
    if (dt == null) return '';

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final messageDate = DateTime(dt.year, dt.month, dt.day);

    if (messageDate == today) {
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$hour:$minute';
    } else if (messageDate == today.subtract(const Duration(days: 1))) {
      return 'Ieri';
    } else if (now.difference(dt).inDays < 7) {
      const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
      return days[dt.weekday - 1];
    } else {
      final day = dt.day.toString().padLeft(2, '0');
      final month = dt.month.toString().padLeft(2, '0');
      return '$day/$month';
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final userState = ref.watch(userStoreProvider);
    final localUserUUID = userState.localUserUUID;
    final users = userState.users;

    // Resolve draft state for this chat
    final draft = ref.watch(chatDraftProvider(chat.uuid));

    // Resolve chat name, avatar and online status
    final metadata = resolveChatMetadata(
      chat: chat,
      localUserUUID: localUserUUID,
      users: users,
      l10n: l10n,
    );

    // Format last message content and sender prefix
    final formattedMessageData = _formatMessageContent(
      chat: chat,
      draft: draft,
      localUserUUID: localUserUUID,
      users: users,
      l10n: l10n,
    );

    final lastMsg = chat.lastMessage;
    final lastMsgStatus = lastMsg?['status']?.toString();
    final isPendingLastMessage = lastMsgStatus == 'PENDING_SEND';

    final timeStr = _formatChatTime(chat);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: isSelected
                ? Theme.of(context).colorScheme.primaryContainer
                      .withValues(alpha: 0.28)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              // Avatar
              Avatar(
                uuid: metadata.profilePictureUUID,
                name: metadata.name,
                seedKey: chat.uuid.isNotEmpty ? chat.uuid : metadata.name,
                size: 48,
                isOnline: metadata.isOnline,
                isSavedMessages: metadata.isSavedMessages,
              ),
              const SizedBox(width: 12),

              // Title and Subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Top Row: Chat Name + Time / Clock
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            metadata.name,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isPendingLastMessage &&
                            !formattedMessageData.isDraft)
                          Padding(
                            padding: const EdgeInsets.only(left: 8),
                            child: Icon(
                              Icons.access_time_rounded,
                              size: 14,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                          )
                        else if (timeStr.isNotEmpty)
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
                    const SizedBox(height: 3),

                    // Bottom Row: Subtitle + Badges (Pin / Unread)
                    Row(
                      children: [
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              children: [
                                if (formattedMessageData.prefix.isNotEmpty)
                                  TextSpan(
                                    text:
                                        formattedMessageData.prefix.endsWith(
                                          ' ',
                                        )
                                        ? formattedMessageData.prefix
                                        : '${formattedMessageData.prefix} ',
                                    style: TextStyle(
                                      color: formattedMessageData.isDraft
                                          ? AppColors.danger
                                          : Theme.of(context)
                                                .colorScheme
                                                .primary,
                                      fontWeight: formattedMessageData.isDraft
                                          ? FontWeight.w700
                                          : FontWeight.w600,
                                      fontSize: 13.5,
                                    ),
                                  ),
                                TextSpan(
                                  text: formattedMessageData.content.replaceAll(
                                    '\n',
                                    ' ',
                                  ),
                                  style: Theme.of(context).textTheme.bodyMedium
                                      ?.copyWith(
                                        color: formattedMessageData.isDraft
                                            ? Theme.of(context)
                                                  .colorScheme
                                                  .onSurface
                                            : Theme.of(context)
                                                  .colorScheme
                                                  .onSurfaceVariant,
                                        fontSize: 13.5,
                                      ),
                                ),
                              ],
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (chat.isPinned)
                          Padding(
                            padding: const EdgeInsets.only(left: 6),
                            child: Icon(
                              Icons.push_pin_rounded,
                              size: 15,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        if (chat.unreadCount > 0)
                          Padding(
                            padding: const EdgeInsets.only(left: 6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.primary,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '${chat.unreadCount}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                      ],
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

  ({String prefix, String content, bool isDraft}) _formatMessageContent({
    required ChatModel chat,
    required ChatDraftState draft,
    required String localUserUUID,
    required Map<String, UserModel> users,
    required AppLocalizations l10n,
  }) {
    if (draft.newMessageText.trim().isNotEmpty || draft.files.isNotEmpty) {
      final draftMessage = formatMessage(
        {
          'type': 'DRAFT',
          'content': draft.newMessageText,
          'files': draft.files,
        },
        localUserUUID: localUserUUID,
        getUser: (uuid) => users[uuid]?.toMap(),
      );
      return (
        prefix: '${l10n.chatDraft}: ',
        content: draftMessage['content']?.toString() ?? '',
        isDraft: true,
      );
    }

    final lastMsg = chat.lastMessage;
    if (lastMsg == null) {
      return (prefix: '', content: '', isDraft: false);
    }

    // Format last message content via message_format.dart
    final formatted = formatMessage(
      lastMsg,
      localUserUUID: localUserUUID,
      getUser: (uuid) => users[uuid]?.toMap(),
    );

    final rawContent = formatted['content']?.toString() ?? '';
    final msgType = lastMsg['type'] as String?;
    final senderUUID = (lastMsg['userUUID'] ?? lastMsg['senderUUID'])
        ?.toString();

    String prefix = '';
    if (msgType == 'system') {
      prefix = '';
    } else if (senderUUID == localUserUUID) {
      prefix = '${l10n.chatYou}: ';
    } else if (senderUUID != null && chat.type != 'DM') {
      final senderUser = users[senderUUID];
      final senderName = senderUser?.displayName.trim().isNotEmpty == true
          ? senderUser!.displayName.trim()
          : (senderUser?.handle?.isNotEmpty == true
                ? '@${senderUser!.handle}'
                : l10n.chatUnknown);
      prefix = '$senderName: ';
    }

    return (prefix: prefix, content: rawContent, isDraft: false);
  }
}
