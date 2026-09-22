import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_fullscreen.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/comms/comms_user_card.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Responsive grid layout displaying members and screenshares in the vocal room.
class CommsMembersLayout extends ConsumerStatefulWidget {
  final List<CommsTileItem> tiles;

  const CommsMembersLayout({super.key, required this.tiles});

  @override
  ConsumerState<CommsMembersLayout> createState() => _CommsMembersLayoutState();
}

class _CommsMembersLayoutState extends ConsumerState<CommsMembersLayout> {
  OverlayEntry? _fullscreenOverlay;
  CommsTileItem? _overlayTile;
  String? _platformFullscreenId;
  Object? _webFullscreenToken;
  bool _syncScheduled = false;

  @override
  void initState() {
    super.initState();
    _webFullscreenToken = CommsFullscreen.addFullscreenChangeListener(() {
      if (!mounted) return;
      if (!CommsFullscreen.isWebFullscreen) {
        final current = ref.read(commsProvider).fullscreenStreamId;
        if (current != null && _platformFullscreenId != null) {
          _platformFullscreenId = null;
          _overlayTile = null;
          ref.read(commsProvider.notifier).exitFullscreen();
          _hideOverlay();
        }
      }
    });
  }

  @override
  void dispose() {
    CommsFullscreen.removeFullscreenChangeListener(_webFullscreenToken);
    _webFullscreenToken = null;
    _hideOverlay();
    if (_platformFullscreenId != null) {
      _platformFullscreenId = null;
      _overlayTile = null;
      unawaited(CommsFullscreen.exit());
    }
    super.dispose();
  }

  void _scheduleSync(CommsTileItem? fullscreenTile, String? fullscreenId) {
    if (_syncScheduled) return;
    _syncScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _syncScheduled = false;
      if (!mounted) return;
      _syncFullscreen(fullscreenTile, fullscreenId);
    });
  }

  void _syncFullscreen(CommsTileItem? fullscreenTile, String? fullscreenId) {
    if (fullscreenTile != null) {
      final isNewRequest = _platformFullscreenId != fullscreenTile.id;
      final tileChanged = _overlayTile != fullscreenTile;
      if (isNewRequest) {
        _platformFullscreenId = fullscreenTile.id;
        _overlayTile = fullscreenTile;
        unawaited(CommsFullscreen.enter());
        _showOverlay(fullscreenTile);
      } else if (tileChanged || _fullscreenOverlay == null) {
        _overlayTile = fullscreenTile;
        if (_fullscreenOverlay == null) {
          _showOverlay(fullscreenTile);
        } else {
          _fullscreenOverlay?.markNeedsBuild();
        }
      }
      return;
    }

    // Requested id exists but tile is gone (leave/unpublish): clear state.
    if (fullscreenId != null) {
      _platformFullscreenId = null;
      _overlayTile = null;
      unawaited(CommsFullscreen.exit());
      _hideOverlay();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ref.read(commsProvider.notifier).exitFullscreen();
      });
      return;
    }

    // Normal state: ensure OS fullscreen + overlay are gone.
    if (_platformFullscreenId != null || _fullscreenOverlay != null) {
      _platformFullscreenId = null;
      _overlayTile = null;
      unawaited(CommsFullscreen.exit());
      _hideOverlay();
    }
  }

  void _showOverlay(CommsTileItem tile) {
    _hideOverlay();
    try {
      OverlayState? overlay;
      try {
        overlay = Overlay.of(context, rootOverlay: true);
      } catch (_) {
        overlay = Overlay.maybeOf(context);
      }
      if (overlay == null) return;
      final entry = OverlayEntry(
        opaque: true,
        maintainState: false,
        builder: (overlayContext) => Material(
          color: Colors.black,
          child: Container(
            color: Colors.black,
            width: double.infinity,
            height: double.infinity,
            child: CommsUserCard(
              tile: tile,
              isPinned: ref.read(commsProvider).pinnedStreamId == tile.id,
              isFullScreen: true,
              onPin: () => ref.read(commsProvider.notifier).togglePin(tile.id),
              onFullScreen: () =>
                  ref.read(commsProvider.notifier).exitFullscreen(),
              onStopShare: tile.trackSid != null
                  ? () => ref
                        .read(commsProvider.notifier)
                        .stopScreenShare(tile.trackSid)
                  : null,
            ),
          ),
        ),
      );
      _fullscreenOverlay = entry;
      overlay.insert(entry);
    } catch (_) {}
  }

  void _hideOverlay() {
    try {
      _fullscreenOverlay?.remove();
    } catch (_) {}
    _fullscreenOverlay = null;
  }

  @override
  Widget build(BuildContext context) {
    final fullscreenId = ref.watch(
      commsProvider.select((s) => s.fullscreenStreamId),
    );
    final pinnedId = ref.watch(
      commsProvider.select((s) => s.pinnedStreamId),
    );

    final controller = ref.read(commsProvider.notifier);

    final fullscreenTile = fullscreenId == null
        ? null
        : widget.tiles.where((t) => t.id == fullscreenId).firstOrNull;

    // Sync OS fullscreen + overlay outside of build.
    _scheduleSync(fullscreenTile, fullscreenId);

    // Filter tiles if a specific stream is pinned
    final activeTiles = (pinnedId != null)
        ? widget.tiles.where((t) => t.id == pinnedId).toList()
        : widget.tiles;

    if (activeTiles.isEmpty) {
      return _buildEmptyState(context);
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final totalElements = activeTiles.length;
        final availableWidth = constraints.maxWidth;
        final availableHeight = constraints.maxHeight;

        final isPortrait = availableHeight > availableWidth;

        int numColumns;
        int numRows;

        if (totalElements == 1) {
          numColumns = 1;
          numRows = 1;
        } else if (totalElements == 2) {
          if (isPortrait) {
            numColumns = 1;
            numRows = 2;
          } else {
            numColumns = 2;
            numRows = 1;
          }
        } else if (totalElements <= 4) {
          numColumns = 2;
          numRows = 2;
        } else if (totalElements <= 6) {
          numColumns = isPortrait ? 2 : 3;
          numRows = (totalElements / numColumns).ceil();
        } else {
          numColumns = math.max(1, (math.sqrt(totalElements)).ceil());
          numRows = (totalElements / numColumns).ceil();
        }

        const margin = 8.0;
        final cellWidth =
            (availableWidth - (numColumns + 1) * margin) / numColumns;
        final cellHeight = (availableHeight - (numRows + 1) * margin) / numRows;

        // Keep 16:9 aspect ratio or adapt to fill nicely
        final cardAspectRatio = 16 / 9;
        double targetWidth = cellWidth;
        double targetHeight = targetWidth / cardAspectRatio;

        if (targetHeight > cellHeight) {
          targetHeight = cellHeight;
          targetWidth = targetHeight * cardAspectRatio;
        }

        return Center(
          child: SingleChildScrollView(
            child: Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: margin,
              runSpacing: margin,
              children: activeTiles.map((tile) {
                return SizedBox(
                  width: targetWidth.clamp(140.0, availableWidth),
                  height: targetHeight.clamp(100.0, availableHeight),
                  child: CommsUserCard(
                    tile: tile,
                    isPinned: pinnedId == tile.id,
                    isFullScreen: false,
                    onPin: () => controller.togglePin(tile.id),
                    onFullScreen: () => controller.toggleFullscreen(tile.id),
                    onStopShare: tile.trackSid != null
                        ? () => controller.stopScreenShare(tile.trackSid)
                        : null,
                  ),
                );
              }).toList(),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
            ),
            child: AppHugeIcon(
              icon: HugeIcons.strokeRoundedAudioWave01,
              color: colorScheme.onSurfaceVariant,
              size: 40,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.commsNoParticipants,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
