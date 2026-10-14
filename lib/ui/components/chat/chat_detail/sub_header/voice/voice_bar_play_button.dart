import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Round play/pause button of the active-voice bar.
class VoiceBarPlayButton extends StatelessWidget {
  const VoiceBarPlayButton({
    super.key,
    required this.isPlaying,
    required this.onToggle,
    this.size = 38,
  });

  final bool isPlaying;
  final VoidCallback onToggle;
  final double size;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;

    return Tooltip(
      message: isPlaying ? l10n.pauseTooltip : l10n.resumeTooltip,
      child: Material(
        color: scheme.primary,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onToggle,
          child: SizedBox(
            width: size,
            height: size,
            child: Center(
              child: AppHugeIcon(
                icon: isPlaying
                    ? HugeIcons.strokeRoundedPause
                    : HugeIcons.strokeRoundedPlay,
                color: scheme.onPrimary,
                size: 22,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
