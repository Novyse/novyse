import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/comms/comms_user_card.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Responsive grid layout displaying members and screenshares in the vocal room.
class CommsMembersLayout extends ConsumerWidget {
  final List<CommsTileItem> tiles;

  const CommsMembersLayout({super.key, required this.tiles});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final commsState = ref.watch(commsProvider);
    final fullscreenId = commsState.fullscreenStreamId;
    final pinnedId = commsState.pinnedStreamId;

    final controller = ref.read(commsProvider.notifier);

    // If an item is in fullscreen mode, render only that item filling the view
    if (fullscreenId != null) {
      final fullscreenTile = tiles
          .where((t) => t.id == fullscreenId)
          .firstOrNull;
      if (fullscreenTile != null) {
        return Container(
          color: Colors.black,
          width: double.infinity,
          height: double.infinity,
          child: CommsUserCard(
            tile: fullscreenTile,
            isPinned: pinnedId == fullscreenTile.id,
            isFullScreen: true,
            onPin: () => controller.togglePin(fullscreenTile.id),
            onFullScreen: () => controller.toggleFullscreen(fullscreenTile.id),
            onStopShare: fullscreenTile.trackSid != null
                ? () => controller.stopScreenShare(fullscreenTile.trackSid)
                : null,
          ),
        );
      }
    }

    // Filter tiles if a specific stream is pinned
    final activeTiles = (pinnedId != null)
        ? tiles.where((t) => t.id == pinnedId).toList()
        : tiles;

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
