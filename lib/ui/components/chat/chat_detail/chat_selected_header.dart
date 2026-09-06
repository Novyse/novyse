import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatSelectedHeader extends StatelessWidget implements PreferredSizeWidget {
  const ChatSelectedHeader({
    super.key,
    required this.selectedCount,
    required this.onClose,
    this.onReply,
    this.onForward,
    this.onDelete,
  });

  final int selectedCount;
  final VoidCallback onClose;
  final VoidCallback? onReply;
  final VoidCallback? onForward;
  final VoidCallback? onDelete;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final canReply = selectedCount > 0 && selectedCount <= 3;

    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      leading: IconButton(
        icon: const AppHugeIcon(
          icon: HugeIcons.strokeRoundedCancel01,
        ),
        onPressed: onClose,
        tooltip: l10n.cancel,
      ),
      titleSpacing: 0,
      title: Text(
        l10n.selectedCount(selectedCount),
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
        ),
      ),
      actionsPadding: const EdgeInsets.only(right: 8.0),
      actions: [
        if (canReply && onReply != null)
          IconButton(
            icon: AppHugeIcon(
              icon: HugeIcons.strokeRoundedArrowMoveUpLeft,
              color: colorScheme.onSurface,
            ),
            tooltip: l10n.reply,
            onPressed: onReply,
          ),
        if (onForward != null)
          IconButton(
            icon: AppHugeIcon(
              icon: HugeIcons.strokeRoundedLinkForward,
              color: colorScheme.onSurface,
            ),
            tooltip: l10n.forward,
            onPressed: onForward,
          ),
        if (onDelete != null)
          IconButton(
            icon: AppHugeIcon(
              icon: HugeIcons.strokeRoundedDelete02,
              color: colorScheme.error,
            ),
            tooltip: l10n.delete,
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (dialogCtx) => AlertDialog(
                  title: Text(l10n.delete),
                  content: Text(
                    selectedCount == 1
                        ? l10n.deleteMessageConfirm
                        : l10n.deleteMessagesConfirm(selectedCount),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(dialogCtx).pop(false),
                      child: Text(l10n.cancel),
                    ),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: colorScheme.error,
                        foregroundColor: colorScheme.onError,
                      ),
                      onPressed: () => Navigator.of(dialogCtx).pop(true),
                      child: Text(l10n.delete),
                    ),
                  ],
                ),
              );
              if (confirmed == true) {
                onDelete?.call();
              }
            },
          ),
      ],
    );
  }
}
