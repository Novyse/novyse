import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Floating prev/next arrows to quickly switch between screen-share streams.
///
/// Only rendered when a screen share is currently pinned or fullscreen and
/// there is more than one screen share to cycle through.
class ScreenShareStreamSwitcher extends ConsumerWidget {
  const ScreenShareStreamSwitcher({
    super.key,
    required this.tiles,
    this.top = 16,
    this.left = 16,
  });

  /// All tiles currently in the room (used to collect screen shares).
  final List<CommsTileItem> tiles;
  final double top;
  final double left;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fullscreenId = ref.watch(
      commsProvider.select((s) => s.fullscreenStreamId),
    );
    final pinnedId = ref.watch(commsProvider.select((s) => s.pinnedStreamId));

    final screenShares = tiles.where((t) => t.isScreenShare).toList();
    if (screenShares.length < 2) return const SizedBox.shrink();

    // Only visible when a screen share is pinned or fullscreen.
    final activeId = fullscreenId ?? pinnedId;
    if (activeId == null) return const SizedBox.shrink();
    final currentIndex = screenShares.indexWhere((t) => t.id == activeId);
    if (currentIndex == -1) return const SizedBox.shrink();

    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    void selectShare(int index) {
      final target = screenShares[index % screenShares.length];
      if (fullscreenId != null) {
        ref.read(commsProvider.notifier).setFullscreen(target.id);
      }
      if (pinnedId != null) {
        ref.read(commsProvider.notifier).setPinned(target.id);
      }
    }

    return Positioned(
      top: top,
      left: left,
      child: FloatingPill(
        padding: const EdgeInsets.all(2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _ArrowButton(
              icon: HugeIcons.strokeRoundedArrowLeft01,
              tooltip: l10n.commsPreviousShare,
              onPressed: () => selectShare(
                currentIndex - 1 < 0 ? screenShares.length - 1 : currentIndex - 1,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Text(
                '${currentIndex + 1}/${screenShares.length}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
            _ArrowButton(
              icon: HugeIcons.strokeRoundedArrowRight01,
              tooltip: l10n.commsNextShare,
              onPressed: () => selectShare((currentIndex + 1) % screenShares.length),
            ),
          ],
        ),
      ),
    );
  }
}

/// Small round arrow button matching the overlay chip button style.
class _ArrowButton extends StatelessWidget {
  const _ArrowButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final dynamic icon;
  final String tooltip;
  final VoidCallback onPressed;

  static const double _size = 32.0;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: _size,
            height: _size,
            child: Center(
              child: AppHugeIcon(
                icon: icon,
                color: colorScheme.onSurfaceVariant,
                size: 18,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

