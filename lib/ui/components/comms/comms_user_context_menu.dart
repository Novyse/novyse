import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_audio.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

import 'comms_volume_control.dart';

/// Context menu for a single vocal tile (mute locale, volume, pin, fullscreen).
Future<void> showCommsUserContextMenu({
  required BuildContext context,
  required CommsTileItem tile,
  required String displayName,
  required bool isPinned,
  required bool isFullScreen,
  required VoidCallback onPin,
  required VoidCallback onFullScreen,
}) {
  final volKey = CommsAudio.volKeyForTile(
    id: tile.id,
    isScreenShare: tile.isScreenShare,
    trackSid: tile.trackSid,
  );
  return ResponsiveOverlay.show<void>(
    context: context,
    mode: ResponsiveOverlayMode.dynamic,
    child: _CommsUserMenuContent(
      tile: tile,
      volKey: volKey,
      displayName: displayName,
      isPinned: isPinned,
      isFullScreen: isFullScreen,
      onPin: onPin,
      onFullScreen: onFullScreen,
    ),
  );
}

class _CommsUserMenuContent extends ConsumerWidget {
  final CommsTileItem tile;
  final String volKey;
  final String displayName;
  final bool isPinned;
  final bool isFullScreen;
  final VoidCallback onPin;
  final VoidCallback onFullScreen;

  const _CommsUserMenuContent({
    required this.tile,
    required this.volKey,
    required this.displayName,
    required this.isPinned,
    required this.isFullScreen,
    required this.onPin,
    required this.onFullScreen,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final isMuted = ref.watch(
      commsProvider.select((s) => s.localMuted[volKey] ?? false),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header: member name (profile route is a placeholder, no navigation).
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              const AppHugeIcon(icon: HugeIcons.strokeRoundedUser, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),

        if (!tile.isLocal) ...[
          ListTile(
            leading: AppHugeIcon(
              icon: isMuted
                  ? HugeIcons.strokeRoundedMicOff02
                  : HugeIcons.strokeRoundedMic02,
              size: 20,
              color: isMuted ? AppColors.danger : null,
            ),
            title: Text(
              isMuted ? l10n.commsUnmuteUser : l10n.commsMuteUser,
              style: TextStyle(
                color: isMuted ? AppColors.danger : colorScheme.onSurface,
              ),
            ),
            onTap: () =>
                ref.read(commsProvider.notifier).toggleLocalMute(volKey),
          ),
          CommsVolumeControl(volKey: volKey),
          const Divider(height: 1),
        ],

        if (!isFullScreen)
          ListTile(
            leading: AppHugeIcon(
              icon: isPinned
                  ? HugeIcons.strokeRoundedPinOff
                  : HugeIcons.strokeRoundedPin,
              size: 20,
            ),
            title: Text(isPinned ? l10n.commsUnpin : l10n.commsPin),
            onTap: () {
              Navigator.of(context, rootNavigator: true).pop();
              onPin();
            },
          ),
        ListTile(
          leading: AppHugeIcon(
            icon: isFullScreen
                ? HugeIcons.strokeRoundedArrowShrink01
                : HugeIcons.strokeRoundedArrowExpand01,
            size: 20,
          ),
          title: Text(
            isFullScreen ? l10n.commsExitFullScreen : l10n.commsFullScreen,
          ),
          onTap: () {
            Navigator.of(context, rootNavigator: true).pop();
            onFullScreen();
          },
        ),
      ],
    );
  }
}
