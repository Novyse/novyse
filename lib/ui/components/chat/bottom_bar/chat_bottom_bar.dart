import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/default_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/no_write_bottom_bar.dart';

class ChatBottomBar extends ConsumerWidget {
  const ChatBottomBar({
    super.key,
    required this.chatUUID,
    this.subID = 0,
    this.readOnly = false,
    this.onToggleAttachMenu,
    this.isAttachMenuOpen = false,
    this.onCloseAttachMenu,
    this.onToggleEmojiMenu,
    this.isEmojiMenuOpen = false,
    this.onCloseEmojiMenu,
  });

  final String chatUUID;
  final int subID;
  final bool readOnly;
  final VoidCallback? onToggleAttachMenu;
  final bool isAttachMenuOpen;
  final VoidCallback? onCloseAttachMenu;
  final VoidCallback? onToggleEmojiMenu;
  final bool isEmojiMenuOpen;
  final VoidCallback? onCloseEmojiMenu;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
        child: readOnly
            ? const NoWriteBottomBar()
            : DefaultBottomBar(
                chatUUID: chatUUID,
                subID: subID,
                isAttachMenuOpen: isAttachMenuOpen,
                onToggleAttachMenu: onToggleAttachMenu,
                onCloseAttachMenu: onCloseAttachMenu,
                isEmojiMenuOpen: isEmojiMenuOpen,
                onToggleEmojiMenu: onToggleEmojiMenu,
                onCloseEmojiMenu: onCloseEmojiMenu,
              ),
      ),
    );
  }
}
