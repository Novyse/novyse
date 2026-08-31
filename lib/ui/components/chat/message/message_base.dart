import 'package:flutter/material.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/message/message_text.dart';
import 'package:novyse/ui/components/chat/message/message_timestamp.dart';

class MessageBase extends StatelessWidget {
  const MessageBase({
    super.key,
    required this.message,
    this.isSender = false,
    this.isSelected = false,
    this.showAvatar = false,
    this.showSenderName = false,
    this.senderUser,
    this.onTap,
    this.onLongPress,
    this.onDoubleTap,
  });

  final MessageModel message;
  final bool isSender;
  final bool isSelected;
  final bool showAvatar;
  final bool showSenderName;
  final UserModel? senderUser;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final VoidCallback? onDoubleTap;

  Widget _buildSenderAvatar(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final name = senderUser?.name ?? '';
    final initial = name.isNotEmpty ? name.substring(0, 1).toUpperCase() : '?';

    return Container(
      width: 32,
      height: 32,
      margin: const EdgeInsets.only(right: 8, bottom: 2),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [colorScheme.primary, colorScheme.primaryContainer],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: colorScheme.onPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildReactionsRow(BuildContext context) {
    if (message.reactions.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Wrap(
        spacing: 4,
        runSpacing: 4,
        children: message.reactions.map((r) {
          final emoji = r['emoji'] as String? ?? '';
          final userUUIDs = (r['userUUIDs'] as List?) ?? [];
          final count = userUUIDs.length;

          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest.withValues(
                alpha: 0.9,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
                width: 0.8,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(emoji, style: const TextStyle(fontSize: 12)),
                if (count > 1) ...[
                  const SizedBox(width: 3),
                  Text(
                    '$count',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                ],
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final screenWidth = MediaQuery.sizeOf(context).width;
    final maxBubbleWidth = (screenWidth - 64).clamp(120.0, screenWidth * 0.78);

    final senderName = senderUser?.displayName.isNotEmpty == true
        ? senderUser!.displayName
        : (senderUser?.handle?.isNotEmpty == true
              ? '@${senderUser!.handle}'
              : (senderUser?.name ?? ''));

    final hasBeenRead = message.reads.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Align(
        alignment: isSender ? Alignment.centerRight : Alignment.centerLeft,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (!isSender && showAvatar) _buildSenderAvatar(context),
            Flexible(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxBubbleWidth),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onTap,
                    onLongPress: onLongPress,
                    onDoubleTap: onDoubleTap,
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSender
                            ? colorScheme.primary
                            : colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(18),
                          topRight: const Radius.circular(18),
                          bottomLeft: Radius.circular(isSender ? 18 : 4),
                          bottomRight: Radius.circular(isSender ? 4 : 18),
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: colorScheme.primary.withValues(
                                    alpha: 0.35,
                                  ),
                                  blurRadius: 6,
                                  spreadRadius: 1,
                                ),
                              ]
                            : null,
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 13,
                        vertical: 8,
                      ),
                      child: Column(
                        crossAxisAlignment: isSender
                            ? CrossAxisAlignment.end
                            : CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Group Sender Name
                          if (!isSender &&
                              showSenderName &&
                              senderName.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 3),
                              child: Text(
                                senderName,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: colorScheme.primary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),

                          // Message Text
                          if (message.content != null &&
                              message.content!.isNotEmpty)
                            MessageText(
                              content: message.content!,
                              isSender: isSender,
                              isSelected: isSelected,
                            ),

                          const SizedBox(height: 4),

                          // Timestamp & Status info
                          MessageTimestamp(
                            createdAt: message.createdAt,
                            isSender: isSender,
                            hasBeenRead: hasBeenRead,
                            isEdited: message.edited,
                            isPinned: message.pinned,
                            isPending: message.isPending,
                            replyCount: message.replyTos.length,
                            compact: true,
                          ),

                          // Reactions
                          _buildReactionsRow(context),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
