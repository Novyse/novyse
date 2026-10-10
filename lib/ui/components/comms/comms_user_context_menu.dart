import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_audio.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu_divider.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu_item.dart';

import 'comms_volume_control.dart';
import 'remote_screen_share_quality_menu.dart';

/// Anchored context menu for a single vocal tile
Future<void> showCommsUserContextMenu({
  required BuildContext context,
  required CommsTileItem tile,
  required String displayName,
  required bool isPinned,
  required bool isFullScreen,
  required Offset anchor,
  required VoidCallback onPin,
  required VoidCallback onFullScreen,
  VoidCallback? onProfileTap,
}) {
  final volKey = CommsAudio.volKeyForTile(
    id: tile.id,
    isScreenShare: tile.isScreenShare,
    trackSid: tile.trackSid,
  );

  const menuWidth = 220.0;
  var estimatedHeight = 140.0;
  if (!tile.isLocal) estimatedHeight += 56.0 + 128.0;
  if (!isFullScreen) estimatedHeight += 52.0;
  if (!tile.isLocal && tile.isScreenShare) estimatedHeight += 44.0;

  return showAppMenu(
    context: context,
    anchor: anchor,
    width: menuWidth,
    estimatedHeight: estimatedHeight,
    builder: (close) => _CommsUserMenuContent(
      tile: tile,
      volKey: volKey,
      displayName: displayName,
      isPinned: isPinned,
      isFullScreen: isFullScreen,
      anchor: anchor,
      onClose: close,
      onPin: () {
        close();
        onPin();
      },
      onFullScreen: () {
        close();
        onFullScreen();
      },
      onProfileTap: onProfileTap == null
          ? null
          : () {
              close();
              onProfileTap();
            },
    ),
  );
}

class _CommsUserMenuContent extends ConsumerWidget {
  final CommsTileItem tile;
  final String volKey;
  final String displayName;
  final bool isPinned;
  final bool isFullScreen;
  final Offset anchor;
  final VoidCallback onClose;
  final VoidCallback onPin;
  final VoidCallback onFullScreen;
  final VoidCallback? onProfileTap;

  const _CommsUserMenuContent({
    required this.tile,
    required this.volKey,
    required this.displayName,
    required this.isPinned,
    required this.isFullScreen,
    required this.anchor,
    required this.onClose,
    required this.onPin,
    required this.onFullScreen,
    this.onProfileTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final isMuted = ref.watch(
      commsProvider.select((s) => s.localMuted[volKey] ?? false),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header: member name (optional profile hook, no navigation by default).
        AppMenuHeader(
          icon: HugeIcons.strokeRoundedUser,
          label: displayName,
          onTap: onProfileTap,
        ),
        const AppMenuDivider(),
        if (!tile.isLocal && tile.isScreenShare && tile.trackSid != null) ...[
          AppMenuItem(
            icon: HugeIcons.strokeRoundedSlidersVertical,
            label: l10n.screenShareQualityTitle,
            onTap: () {
              onClose();
              showRemoteScreenShareQualityMenu(
                context: context,
                ref: ref,
                trackSid: tile.trackSid!,
                anchor: anchor,
              );
            },
          ),
          const AppMenuDivider(),
        ],
        if (!tile.isLocal) ...[
          AppMenuItem(
            icon: isMuted
                ? HugeIcons.strokeRoundedMicOff02
                : HugeIcons.strokeRoundedMic02,
            label: isMuted ? l10n.commsUnmuteUser : l10n.commsMuteUser,
            isDanger: isMuted,
            // Stays open so volume can be adjusted right after muting.
            onTap: () =>
                ref.read(commsProvider.notifier).toggleLocalMute(volKey),
          ),
          CommsVolumeControl(volKey: volKey, persist: !tile.isScreenShare),
          const AppMenuDivider(),
        ],
        if (!isFullScreen)
          AppMenuItem(
            icon: isPinned
                ? HugeIcons.strokeRoundedPinOff
                : HugeIcons.strokeRoundedPin,
            label: isPinned ? l10n.commsUnpin : l10n.commsPin,
            onTap: onPin,
          ),
        AppMenuItem(
          icon: isFullScreen
              ? HugeIcons.strokeRoundedArrowShrink01
              : HugeIcons.strokeRoundedArrowExpand01,
          label: isFullScreen ? l10n.commsExitFullScreen : l10n.commsFullScreen,
          onTap: onFullScreen,
        ),
      ],
    );
  }
}
