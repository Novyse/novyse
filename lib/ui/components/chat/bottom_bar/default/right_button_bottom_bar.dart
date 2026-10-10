import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class RightButtonBottomBar extends StatelessWidget {
  const RightButtonBottomBar({
    super.key,
    required this.isRecording,
    required this.hasText,
    required this.hasFiles,
    required this.onSendMessage,
    required this.onStartRecording,
    required this.onStopAndSend,
    this.isSending = false,
  });

  final bool isRecording;
  final bool hasText;
  final bool hasFiles;
  final VoidCallback onSendMessage;
  final VoidCallback onStartRecording;
  final VoidCallback onStopAndSend;
  final bool isSending;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final shouldShowSend = isRecording || hasText || hasFiles;

    final tooltip = isRecording
        ? l10n.sendVoiceTooltip
        : shouldShowSend
        ? l10n.sendMessageTooltip
        : l10n.recordVoiceTooltip;

    final icon = isSending
        ? SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: colorScheme.onPrimary,
            ),
          )
        : AppHugeIcon(
            icon: shouldShowSend
                ? HugeIcons.strokeRoundedSent
                : HugeIcons.strokeRoundedMic02,
            size: 20,
            color: shouldShowSend
                ? colorScheme.onPrimary
                : colorScheme.onSurface,
          );

    final VoidCallback? onTap = isSending
        ? null
        : () {
            if (isRecording) {
              onStopAndSend();
            } else if (shouldShowSend) {
              onSendMessage();
            } else {
              onStartRecording();
            }
          };

    if (shouldShowSend) {
      return Tooltip(
        message: tooltip,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(
              FloatingAppBarConsts.pillRadius,
            ),
            child: Container(
              width: FloatingAppBarConsts.iconPillOuterSize,
              height: FloatingAppBarConsts.iconPillOuterSize,
              decoration: BoxDecoration(
                color: colorScheme.primary,
                shape: BoxShape.circle,
                border: Border.all(color: colorScheme.primary),
              ),
              alignment: Alignment.center,
              child: icon,
            ),
          ),
        ),
      );
    }

    return Tooltip(
      message: tooltip,
      child: FloatingPill(
        padding: FloatingAppBarConsts.iconPillPadding,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(
              FloatingAppBarConsts.pillRadius,
            ),
            child: SizedBox(
              width: FloatingAppBarConsts.iconButtonSize,
              height: FloatingAppBarConsts.iconButtonSize,
              child: Center(child: icon),
            ),
          ),
        ),
      ),
    );
  }
}
