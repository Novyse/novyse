import 'package:flutter/material.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/l10n/l10n.dart';

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

    return Tooltip(
      message: l10n.activeVoiceSpeedTitle,
      child: Material(
        color: scheme.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        clipBehavior: Clip.antiAlias,
        child: Builder(
          builder: (chipContext) => InkWell(
            borderRadius: BorderRadius.circular(999),
            onTap: () => _openMenu(chipContext),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              child: Text(
                formatSpeed(speed),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: scheme.primary,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
