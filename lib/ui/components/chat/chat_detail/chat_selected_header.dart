import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
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

  static const _pillSpacing = 8.0;

  Widget _pill({
    required ColorScheme scheme,
    required Widget child,
    EdgeInsetsGeometry padding = EdgeInsets.zero,
    double radius = 100,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: scheme.surface.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: scheme.outline.withValues(alpha: 0.25)),
          ),
          child: child,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final canReply = selectedCount > 0 && selectedCount <= 3;

    final hasActions =
        (canReply && onReply != null) || onForward != null || onDelete != null;

    final content = Row(
      children: [
        _pill(
          scheme: colorScheme,
          padding: const EdgeInsets.all(2),
          child: IconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
            tooltip: l10n.cancel,
            onPressed: onClose,
          ),
        ),
        const SizedBox(width: _pillSpacing),
        Expanded(
          child: _pill(
            scheme: colorScheme,
            radius: 28,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
            child: SizedBox(
              height: 48,
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
          const SizedBox(width: _pillSpacing),
          _pill(
            scheme: colorScheme,
            padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
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
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              content,
              if (bottom != null) ...[const SizedBox(height: 8), bottom!],
            ],
          ),
        ),
      ),
    );
  }
}
