import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu_handler.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu_item.dart';

/// Floating icon-only popover of the message-type (attach) menu.
class AttachMenuPopover extends ConsumerWidget {
  const AttachMenuPopover({
    super.key,
    required this.chatUUID,
    required this.onClose,
  });

  final String chatUUID;
  final VoidCallback onClose;

  static const List<AttachMenuAction> menuItems = [
    AttachMenuAction.media,
    AttachMenuAction.camera,
    AttachMenuAction.file,
    AttachMenuAction.recording,
    AttachMenuAction.location,
    AttachMenuAction.todo,
    AttachMenuAction.poll,
  ];

  Future<void> _handleAction(WidgetRef ref, AttachMenuAction action) async {
    switch (action) {
      case AttachMenuAction.media:
        onClose();
        await AttachMenuHandler.pickMedia(ref, chatUUID);
      case AttachMenuAction.file:
        onClose();
        await AttachMenuHandler.pickFile(ref, chatUUID);
      case AttachMenuAction.camera:
      case AttachMenuAction.recording:
      case AttachMenuAction.location:
      case AttachMenuAction.todo:
      case AttachMenuAction.poll:
        break;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: colorScheme.outlineVariant.withValues(alpha: 0.5),
          ),
          boxShadow: const [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 12,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final action in menuItems)
              AttachMenuItem(
                action: action,
                label: action.label(l10n),
                icon: action.icon,
                enabled: action.enabled,
                onPressed: () => _handleAction(ref, action),
                iconOnly: true,
              ),
          ],
        ),
      ),
    );
  }
}
