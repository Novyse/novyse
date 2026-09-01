import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/default_bottom_bar.dart';

class ChatBottomBar extends ConsumerWidget {
  const ChatBottomBar({
    super.key,
    required this.chatUUID,
    this.subID = 0,
    this.readOnly = false,
    this.onToggleAttachMenu,
    this.isAttachMenuOpen = false,
  });

  final String chatUUID;
  final int subID;
  final bool readOnly;
  final VoidCallback? onToggleAttachMenu;
  final bool isAttachMenuOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
        child: readOnly
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Text(
                    l10n.channelReadOnlyHint,
                    style: TextStyle(
                      fontSize: 13,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              )
            : DefaultBottomBar(
                chatUUID: chatUUID,
                subID: subID,
                isAttachMenuOpen: isAttachMenuOpen,
                onToggleAttachMenu: onToggleAttachMenu,
              ),
      ),
    );
  }
}
