import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/default_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/no_write_bottom_bar.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';

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
    // Stesse misure/insets delle appbar flottanti: SafeArea + padding
    // Il contenuto è a misura variabile (il testo cresce fino a 4 righe),
    // quindi niente altezza fissa: FloatingPill shrink-wrap dentro.
    return ProgressiveOpacityBackground(
      direction: ProgressiveOpacityDirection.bottomToTop,
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
    );
  }
}
