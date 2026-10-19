import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/themes/themes.dart';

import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';

import 'comms_control_button.dart';

/// Mic / webcam / leave actions of the comms bar.
/// Same icons, tooltips and colors as [CommsBottomBar]; errors are ignored.
///
/// Sizes come straight from [FloatingAppBarConsts]: 42 box + 24 glyph,
/// like every app bar icon — no per-call-site overrides.
class CommsBarActions extends ConsumerWidget {
  const CommsBarActions({super.key});

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
        ),
        const SizedBox(
          width: FloatingAppBarConsts.subHeaderActionsGap,
        ),
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
        ),
        const SizedBox(
          width: FloatingAppBarConsts.subHeaderActionsGap,
        ),
        CommsControlButton(
          icon: HugeIcons.strokeRoundedCall02,
          tooltip: l10n.commsLeaveRoom,
          backgroundColor: status.danger,
          iconColor: Colors.white,
          onPressed: () => unawaited(controller.leave()),
        ),
      ],
    );
  }
}
