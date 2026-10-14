import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/themes/themes.dart';

import 'comms_control_button.dart';

/// Mic / webcam / leave actions of the comms bar.
/// Same icons, tooltips and colors as [CommsBottomBar]; errors are ignored.
class CommsBarActions extends ConsumerWidget {
  const CommsBarActions({super.key, this.buttonSize = 34});

  final double buttonSize;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final commsState = ref.watch(commsProvider);
    final controller = ref.read(commsProvider.notifier);

    final scheme = Theme.of(context).colorScheme;
    final status = context.statusColors;
    final idleBg = scheme.surfaceContainerHighest;
    final idleIcon = scheme.onSurfaceVariant;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        CommsControlButton(
          icon: commsState.isAudioEnabled
              ? HugeIcons.strokeRoundedMic02
              : HugeIcons.strokeRoundedMicOff02,
          tooltip: commsState.isAudioEnabled
              ? l10n.commsMuteMic
              : l10n.commsUnmuteMic,
          backgroundColor: !commsState.isAudioEnabled
              ? status.danger
              : idleBg,
          iconColor: !commsState.isAudioEnabled ? Colors.white : idleIcon,
          onPressed: () => unawaited(controller.toggleAudio()),
          size: buttonSize,
        ),
        const SizedBox(width: 8),
        CommsControlButton(
          icon: commsState.isVideoEnabled
              ? HugeIcons.strokeRoundedVideo02
              : HugeIcons.strokeRoundedVideoOff,
          tooltip: commsState.isVideoEnabled
              ? l10n.commsTurnOffCamera
              : l10n.commsTurnOnCamera,
          backgroundColor: commsState.isVideoEnabled
              ? scheme.primary
              : idleBg,
          iconColor: commsState.isVideoEnabled
              ? scheme.onPrimary
              : idleIcon,
          onPressed: () => unawaited(controller.toggleVideo()),
          size: buttonSize,
        ),
        const SizedBox(width: 8),
        CommsControlButton(
          icon: HugeIcons.strokeRoundedCall02,
          tooltip: l10n.commsLeaveRoom,
          backgroundColor: status.danger,
          iconColor: Colors.white,
          onPressed: () => unawaited(controller.leave()),
          size: buttonSize,
        ),
      ],
    );
  }
}
