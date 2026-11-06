import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu_sheet.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Left composer button: opens the attach menu, or cancels an ongoing
/// voice recording.
///
/// Plain [FloatingPill] icon button (same 48 outer box as the right button
/// and the composer pill) — no rotation animation.
class LeftButtonBottomBar extends StatelessWidget {
  const LeftButtonBottomBar({
    super.key,
    required this.chatUUID,
    required this.isRecording,
    required this.onCancelRecording,
  });

  final String chatUUID;
  final bool isRecording;
  final VoidCallback onCancelRecording;

  void _handlePress(BuildContext context) {
    if (isRecording) {
      onCancelRecording();
    } else {
      showAttachMenuSheet(context, chatUUID);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final tooltip = isRecording
        ? l10n.cancelRecordingTooltip
        : l10n.attachFilesTooltip;

    return Tooltip(
      message: tooltip,
      child: FloatingPill(
        padding: FloatingConsts.iconPillPadding,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => _handlePress(context),
            borderRadius: BorderRadius.circular(
              FloatingConsts.pillRadius,
            ),
            child: SizedBox(
              width: FloatingConsts.iconButtonSize,
              height: FloatingConsts.iconButtonSize,
              child: Center(
                child: AppHugeIcon(
                  icon: HugeIcons.strokeRoundedPlus,
                  color: colorScheme.onSurface,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
