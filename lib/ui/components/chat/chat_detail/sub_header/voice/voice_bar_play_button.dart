import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Round play/pause button of the active-voice bar. Sizes come straight
/// from [FloatingConsts]: 24 glyph in a 42 box, like every app bar.
class VoiceBarPlayButton extends StatelessWidget {
  const VoiceBarPlayButton({
    super.key,
    required this.isPlaying,
    required this.onToggle,
  });

  final bool isPlaying;
  final VoidCallback onToggle;

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
            width: FloatingConsts.barContentSize,
            height: FloatingConsts.barContentSize,
            child: Center(
              child: AppHugeIcon(
                icon: isPlaying
                    ? HugeIcons.strokeRoundedPause
                    : HugeIcons.strokeRoundedPlay,
                color: scheme.onPrimary,
                size: FloatingConsts.barIconSize,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
