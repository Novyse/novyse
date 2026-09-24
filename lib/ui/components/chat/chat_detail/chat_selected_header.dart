import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatSelectedHeader extends StatelessWidget {
  const ChatSelectedHeader({
    super.key,
    required this.selectedCount,
    required this.onClose,
    this.onReply,
    this.onForward,
    this.onDelete,
    this.bottom,
  });

  final int selectedCount;
  final VoidCallback onClose;
  final VoidCallback? onReply;
  final VoidCallback? onForward;
  final VoidCallback? onDelete;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final canReply = selectedCount > 0 && selectedCount <= 3;

    final hasActions =
        (canReply && onReply != null) || onForward != null || onDelete != null;

    final content = Row(
      children: [
        FloatingPill(
          padding: FloatingAppBarConsts.iconPillPadding,
          child: FloatingIconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
            tooltip: l10n.cancel,
            onPressed: onClose,
          ),
        ),
        const SizedBox(width: FloatingAppBarConsts.pillSpacing),
        Expanded(
          child: FloatingPill(
            radius: FloatingAppBarConsts.centralRadius,
            padding: FloatingAppBarConsts.centralTitlePadding,
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                minHeight: FloatingAppBarConsts.centralMinHeight,
              ),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  l10n.selectedCount(selectedCount),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          ),
        ),
        if (hasActions) ...[
          const SizedBox(width: FloatingAppBarConsts.pillSpacing),
          FloatingPill(
            padding: FloatingAppBarConsts.actionsPadding,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (canReply && onReply != null)
                  FloatingIconButton(
                    icon: AppHugeIcon(
                      icon: HugeIcons.strokeRoundedArrowMoveUpLeft,
                      color: colorScheme.onSurface,
                    ),
                    tooltip: l10n.reply,
                    onPressed: onReply,
                  ),
                if (onForward != null)
                  FloatingIconButton(
                    icon: AppHugeIcon(
                      icon: HugeIcons.strokeRoundedLinkForward,
                      color: colorScheme.onSurface,
                    ),
                    tooltip: l10n.forward,
                    onPressed: onForward,
                  ),
                if (onDelete != null)
                  FloatingIconButton(
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
                              onPressed: () =>
                                  Navigator.of(dialogCtx).pop(false),
                              child: Text(l10n.cancel),
                            ),
                            FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: colorScheme.error,
                                foregroundColor: colorScheme.onError,
                              ),
                              onPressed: () =>
                                  Navigator.of(dialogCtx).pop(true),
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
            ),
          ),
        ],
      ],
    );

    return ProgressiveOpacityBackground(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          content,
          if (bottom != null) ...[
            const SizedBox(height: FloatingAppBarConsts.bottomGap),
            bottom!,
          ],
        ],
      ),
    );
  }
}
