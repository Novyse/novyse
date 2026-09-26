import 'package:flutter/material.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/message/message_base.dart';
import 'package:novyse/ui/components/chat/message/swipe_to_reply.dart';

/// A single row of the message list: swipe-to-reply wrapping the bubble.
/// [itemKey] identifies the row for scrolling and visibility checks; it is
/// applied to the inner [KeyedSubtree] and must not be reused elsewhere.
class MessageListItem extends StatelessWidget {
  const MessageListItem({
    super.key,
    required this.itemKey,
    required this.message,
    required this.isSender,
    required this.isSelected,
    required this.isSelectionMode,
    required this.showAvatar,
    required this.showSenderName,
    required this.senderUser,
    required this.searchHighlight,
    required this.isCurrentSearchMatch,
    required this.quoteHighlightRange,
    required this.canReply,
    required this.onReply,
    required this.onReplyTap,
    required this.onSelectionToggle,
    required this.onOpenContextMenu,
    required this.getMessage,
    required this.getUser,
  });

  final GlobalKey itemKey;
  final MessageModel message;
  final bool isSender;
  final bool isSelected;
  final bool isSelectionMode;
  final bool showAvatar;
  final bool showSenderName;
  final UserModel? senderUser;
  final String searchHighlight;
  final bool isCurrentSearchMatch;
  final TextRange? quoteHighlightRange;
  final bool canReply;
  final VoidCallback onReply;
  final void Function({
    required String chatUUID,
    required int subID,
    required int messageID,
    int? rangeStart,
    int? rangeEnd,
  })? onReplyTap;
  final VoidCallback? onSelectionToggle;
  final void Function(Offset position, String? selectedText)? onOpenContextMenu;
  final MessageModel? Function(String chatUUID, int subID, int messageID)?
  getMessage;
  final UserModel? Function(String uuid)? getUser;

  @override
  Widget build(BuildContext context) {
    return KeyedSubtree(
      key: itemKey,
      child: SwipeToReply(
        enabled: !isSelectionMode && message.type != 'system' && canReply,
        isSender: isSender,
        onReply: onReply,
        child: MessageBase(
          message: message,
          isSender: isSender,
          isSelected: isSelected,
          isSelectionMode: isSelectionMode,
          showAvatar: showAvatar,
          showSenderName: showSenderName,
          senderUser: senderUser,
          searchHighlight: searchHighlight,
          isCurrentSearchMatch: isCurrentSearchMatch,
          quoteHighlightRange: quoteHighlightRange,
          onReplyTap: onReplyTap,
          onSelectionToggle: onSelectionToggle,
          onOpenContextMenu: onOpenContextMenu,
          getMessage: getMessage,
          getUser: getUser,
        ),
      ),
    );
  }
}
