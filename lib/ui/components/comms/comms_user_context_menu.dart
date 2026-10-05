import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_audio.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/huge_icon.dart';

import 'comms_volume_control.dart';

/// Anchored context menu for a single vocal tile (mute locale, volume, pin,
/// fullscreen)
/// Opened via right-click (desktop/web) or double-tap (touch): no buttons,
/// no long-press.
Future<void> showCommsUserContextMenu({
  required BuildContext context,
  required CommsTileItem tile,
  required String displayName,
  required bool isPinned,
  required bool isFullScreen,
  required Offset anchor,
  required VoidCallback onPin,
  required VoidCallback onFullScreen,
}) {
  final volKey = CommsAudio.volKeyForTile(
    id: tile.id,
    isScreenShare: tile.isScreenShare,
    trackSid: tile.trackSid,
  );

  final overlay = Overlay.of(context, rootOverlay: true);
  final renderBox = overlay.context.findRenderObject();
  final overlaySize = renderBox is RenderBox && renderBox.hasSize
      ? renderBox.size
      : MediaQuery.sizeOf(context);

  const menuWidth = 240.0;
  const edgePadding = 12.0;
  var estimatedHeight = 140.0;
  if (!tile.isLocal) estimatedHeight += 56.0 + 128.0;
  if (!isFullScreen) estimatedHeight += 52.0;

  var x = anchor.dx;
  if (x + menuWidth > overlaySize.width - edgePadding) {
    x = overlaySize.width - menuWidth - edgePadding;
  }
  x = x.clamp(edgePadding, overlaySize.width - menuWidth - edgePadding);

  var y = anchor.dy;
  if (y + estimatedHeight > overlaySize.height - edgePadding) {
    y = anchor.dy - estimatedHeight;
  }
  y = y.clamp(
    edgePadding,
    (overlaySize.height - 120.0).clamp(edgePadding, overlaySize.height),
  );

  final completer = Completer<void>();
  var closed = false;
  late final OverlayEntry entry;

  void close() {
    if (closed) return;
    closed = true;
    try {
      entry.remove();
    } catch (_) {}
    if (!completer.isCompleted) completer.complete();
  }

  Widget menuCard() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Material(
          color: Colors.black.withValues(alpha: 0.72),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Theme(
              data: ThemeData.dark(useMaterial3: true),
              child: _CommsUserMenuContent(
                tile: tile,
                volKey: volKey,
                displayName: displayName,
                isPinned: isPinned,
                isFullScreen: isFullScreen,
                onPin: () {
                  close();
                  onPin();
                },
                onFullScreen: () {
                  close();
                  onFullScreen();
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  entry = OverlayEntry(
    builder: (entryContext) => Stack(
      children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: close,
          onSecondaryTapUp: (_) => close(),
          child: const SizedBox.expand(),
        ),
        Positioned(left: x, top: y, width: menuWidth, child: menuCard()),
      ],
    ),
  );

  overlay.insert(entry);
  return completer.future;
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
              const AppHugeIcon(
                icon: HugeIcons.strokeRoundedUser,
                size: 20,
                color: Colors.white,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall
                      ?.copyWith(color: Colors.white),
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: Colors.white24),
        if (!tile.isLocal) ...[
          ListTile(
            dense: true,
            leading: AppHugeIcon(
              icon: isMuted
                  ? HugeIcons.strokeRoundedMicOff02
                  : HugeIcons.strokeRoundedMic02,
              size: 20,
              color: isMuted ? AppColors.danger : Colors.white,
            ),
            title: Text(
              isMuted ? l10n.commsUnmuteUser : l10n.commsMuteUser,
              style: TextStyle(
                color: isMuted ? AppColors.danger : Colors.white,
              ),
            ),
            // Stays open so volume can be adjusted right after muting.
            onTap: () =>
                ref.read(commsProvider.notifier).toggleLocalMute(volKey),
          ),
          CommsVolumeControl(volKey: volKey, persist: !tile.isScreenShare),
          const Divider(height: 1, color: Colors.white24),
        ],
        if (!isFullScreen)
          ListTile(
            dense: true,
            leading: AppHugeIcon(
              icon: isPinned
                  ? HugeIcons.strokeRoundedPinOff
                  : HugeIcons.strokeRoundedPin,
              size: 20,
              color: Colors.white,
            ),
            title: Text(
              isPinned ? l10n.commsUnpin : l10n.commsPin,
              style: const TextStyle(color: Colors.white),
            ),
            onTap: onPin,
          ),
        ListTile(
          dense: true,
          leading: AppHugeIcon(
            icon: isFullScreen
                ? HugeIcons.strokeRoundedArrowShrink01
                : HugeIcons.strokeRoundedArrowExpand01,
            size: 20,
            color: Colors.white,
          ),
          title: Text(
            isFullScreen ? l10n.commsExitFullScreen : l10n.commsFullScreen,
            style: const TextStyle(color: Colors.white),
          ),
          onTap: onFullScreen,
        ),
      ],
    );
  }
}
