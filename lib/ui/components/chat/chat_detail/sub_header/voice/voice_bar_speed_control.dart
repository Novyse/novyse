import 'package:flutter/material.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';

import 'voice_speed_menu.dart';

/// Speed chip of the active-voice bar opening an attachment-style
/// speed picker menu. The picked speed applies immediately.
class VoiceBarSpeedControl extends StatelessWidget {
  const VoiceBarSpeedControl({super.key, required this.speed});

  final double speed;

  static String formatSpeed(double value) {
    final text = value.toStringAsFixed(2).replaceAll(RegExp(r'0+$'), '');
    final trimmed = text.endsWith('.')
        ? text.substring(0, text.length - 1)
        : text;
    return '${trimmed}x';
  }

  Future<void> _openMenu(BuildContext chipContext) async {
    final picked = await showVoiceSpeedMenu(chipContext, speed, formatSpeed);
    if (picked != null) {
      await ChatAudioService.instance.setSpeed(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final l10n = AppLocalizations.of(context)!;

    // Same 42 circle container as the X next to it (and every app bar
    // icon): no filled chip anymore, so hover/ink is identical.
    return Tooltip(
      message: l10n.activeVoiceSpeedTitle,
      child: Builder(
        builder: (chipContext) => IconButton(
          style: const ButtonStyle(
            minimumSize: WidgetStatePropertyAll(
              Size(
                FloatingAppBarConsts.barContentSize,
                FloatingAppBarConsts.barContentSize,
              ),
            ),
            maximumSize: WidgetStatePropertyAll(
              Size(
                FloatingAppBarConsts.barContentSize,
                FloatingAppBarConsts.barContentSize,
              ),
            ),
            padding: WidgetStatePropertyAll(EdgeInsets.all(4)),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          onPressed: () => _openMenu(chipContext),
          icon: Text(
            formatSpeed(speed),
            maxLines: 1,
            overflow: TextOverflow.clip,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: scheme.onSurfaceVariant,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ),
      ),
    );
  }
}
