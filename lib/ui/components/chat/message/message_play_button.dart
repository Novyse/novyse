import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Round play/pause button used by voice and audio message bubbles.
class MessagePlayButton extends StatelessWidget {
  const MessagePlayButton({
    super.key,
    required this.isPlaying,
    required this.isPlayable,
    this.isPending = false,
    this.isLoading = false,
    this.onTap,
  });

  final bool isPlaying;
  final bool isPlayable;
  final bool isPending;
  final bool isLoading;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final active = isPlayable || isLoading;
    final showSpinner = isLoading || isPending;
    final foreground = active
        ? colorScheme.onPrimary
        : colorScheme.onSurfaceVariant;

    return GestureDetector(
      onTap: isPlayable && !isPending && !isLoading ? onTap : null,
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: active
              ? colorScheme.primary
              : colorScheme.surfaceContainerHighest,
          shape: BoxShape.circle,
        ),
        child: showSpinner
            ? Padding(
                padding: const EdgeInsets.all(10),
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: foreground,
                ),
              )
            : AppHugeIcon(
                icon: isPlaying
                    ? HugeIcons.strokeRoundedPause
                    : HugeIcons.strokeRoundedPlay,
                color: foreground,
                size: 24,
              ),
      ),
    );
  }
}
