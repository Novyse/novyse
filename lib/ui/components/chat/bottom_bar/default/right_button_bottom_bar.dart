import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
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

    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isSending
              ? null
              : () {
                  if (isRecording) {
                    onStopAndSend();
                  } else if (shouldShowSend) {
                    onSendMessage();
                  } else {
                    onStartRecording();
                  }
                },
          borderRadius: BorderRadius.circular(24),
          child: Container(
            width: 45,
            height: 45,
            decoration: BoxDecoration(
              color: shouldShowSend
                  ? colorScheme.primary
                  : colorScheme.surfaceContainerHighest.withValues(alpha: 0.65),
              shape: BoxShape.circle,
              border: Border.all(
                color: shouldShowSend
                    ? colorScheme.primary
                    : colorScheme.outlineVariant.withValues(alpha: 0.5),
              ),
            ),
            alignment: Alignment.center,
            child: isSending
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
                  ),
          ),
        ),
      ),
    );
  }
}
