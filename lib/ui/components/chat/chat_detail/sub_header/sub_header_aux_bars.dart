import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/storage/file/playable_uri.dart';
import 'package:novyse/ui/components/chat/chat_detail/sub_header/comms/chat_comms_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/sub_header/voice/chat_active_voice_bar.dart';

/// Shared voice + comms bars column, each bar self-hides when inactive.
class SubHeaderAuxBars extends ConsumerWidget {
  const SubHeaderAuxBars({super.key, this.compact = true, this.framed = false});

  final bool compact;
  final bool framed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final audio = ref.watch(chatAudioServiceProvider);
    final hasVoice =
        audio.activeId != null && isPlayableMediaUri(audio.activeUri);
    final commsState = ref.watch(commsProvider);
    final hasComms =
        commsState.connected && commsState.currentChatUUID != null;

    if (!hasVoice && !hasComms) return const SizedBox.shrink();

    final column = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (hasVoice) ChatActiveVoiceBar(compact: compact),
        if (hasComms) ChatCommsBar(compact: compact),
      ],
    );

    if (!framed) return column;

    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: colorScheme.surface.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.25),
              ),
            ),
            child: column,
          ),
        ),
      ),
    );
  }
}
