import 'dart:async';
import 'dart:ui';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/comms/comms_user_context_menu.dart';
import 'package:novyse/ui/components/comms/remote_screen_share_quality_menu.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Renders an individual participant card or screen share tile in the vocal room.
class CommsUserCard extends ConsumerStatefulWidget {
  final CommsTileItem tile;
  final bool isPinned;
  final bool isFullScreen;
  final VoidCallback onPin;
  final VoidCallback onFullScreen;
  final VoidCallback? onStopShare;
  final VoidCallback? onEditShare;

  const CommsUserCard({
    super.key,
    required this.tile,
    this.isPinned = false,
    this.isFullScreen = false,
    required this.onPin,
    required this.onFullScreen,
    this.onStopShare,
    this.onEditShare,
  });

  @override
  ConsumerState<CommsUserCard> createState() => _CommsUserCardState();
}

class _CommsUserCardState extends ConsumerState<CommsUserCard> {
  static const _autoHideDuration = Duration(seconds: 3);

  bool _isHovered = false;

  bool _overlayUiVisible = true;
  Timer? _autoHideTimer;

  @override
  void initState() {
    super.initState();
    if (widget.isFullScreen) _scheduleAutoHide();
  }

  @override
  void didUpdateWidget(covariant CommsUserCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isFullScreen != oldWidget.isFullScreen) {
      _showOverlayUi();
      if (!widget.isFullScreen) _cancelAutoHide();
    }
  }

  @override
  void dispose() {
    _cancelAutoHide();
    super.dispose();
  }

  void _scheduleAutoHide() {
    if (!widget.isFullScreen) return;
    _cancelAutoHide();
    _autoHideTimer = Timer(_autoHideDuration, () {
      if (mounted && widget.isFullScreen) {
        setState(() => _overlayUiVisible = false);
      }
    });
  }

  void _cancelAutoHide() {
    _autoHideTimer?.cancel();
    _autoHideTimer = null;
  }

  void _showOverlayUi() {
    if (!mounted) return;
    if (!_overlayUiVisible) {
      setState(() => _overlayUiVisible = true);
    }
    _scheduleAutoHide();
  }

  void _onCardTap() {
    if (!widget.isFullScreen) return;
    if (_overlayUiVisible) {
      setState(() => _overlayUiVisible = false);
      _cancelAutoHide();
    } else {
      _showOverlayUi();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final tile = widget.tile;
    final colorScheme = Theme.of(context).colorScheme;

    // Fetch user details solely via userUUID from the local store
    final user = ref.watch(userProvider(tile.userUUID));
    final displayName =
        user?.displayName ?? (tile.isLocal ? l10n.chatYou : l10n.user);
    final pfpUUID = user?.profilePictureUUID ?? tile.userUUID;

    final String labelText;
    if (tile.isScreenShare) {
      labelText = l10n.commsUserScreenShare(displayName);
    } else if (tile.isLocal) {
      labelText = l10n.commsUserYou(displayName);
    } else {
      labelText = displayName;
    }

    final videoTrack = tile.hasActiveVideo ? tile.videoTrack : null;
    final isSpeaking = tile.isSpeaking && !tile.isScreenShare;

    // Mute badges (bottom-right):
    // - mic-with-lock: local-only mute from this client's context menu.
    // - plain mic-off: remote self-mute broadcast by LiveKit (bottombar),
    //   or own mic state for the local tile.
    final ownMicOff = tile.isLocal && !tile.isScreenShare
        ? !ref.watch(commsProvider.select((s) => s.isAudioEnabled))
        : false;
    final showLocalLock = tile.isLocallyMuted && !tile.isLocal;
    final showRemoteSimple =
        !showLocalLock && (tile.isRemoteMuted || ownMicOff);

    final controlsOpacity = widget.isFullScreen
        ? (_overlayUiVisible ? 1.0 : 0.0)
        : ((_isHovered || widget.isPinned) ? 1.0 : 0.0);

    void openMenu(Offset anchor) {
      showCommsUserContextMenu(
        context: context,
        tile: tile,
        displayName: labelText,
        isPinned: widget.isPinned,
        isFullScreen: widget.isFullScreen,
        anchor: anchor,
        onPin: widget.onPin,
        onFullScreen: widget.onFullScreen,
      );
      if (widget.isFullScreen) _showOverlayUi();
    }

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: widget.isFullScreen ? _onCardTap : null,
      onSecondaryTapUp: (details) => openMenu(details.globalPosition),
      child: MouseRegion(
        onEnter: (_) {
          setState(() => _isHovered = true);
          if (widget.isFullScreen) _showOverlayUi();
        },
        onHover: (_) {
          if (widget.isFullScreen) _showOverlayUi();
        },
        onExit: (_) => setState(() => _isHovered = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.isFullScreen ? 0 : 20),
            border: Border.all(
              color: isSpeaking
                  ? AppColors.success
                  : colorScheme.outline.withValues(alpha: 0.25),
              width: isSpeaking ? 2.5 : 1,
            ),
            boxShadow: isSpeaking
                ? [
                    BoxShadow(
                      color: AppColors.success.withValues(alpha: 0.4),
                      blurRadius: 16,
                      spreadRadius: 2,
                    ),
                  ]
                : null,
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Video or Avatar Content (double-tap opens the menu).
              _DoubleTapBackground(
                onDoubleTap: openMenu,
                child: videoTrack != null
                    ? VideoTrackRenderer(videoTrack)
                    : _buildAvatarFallback(context, pfpUUID, displayName),
              ),

              // Top-right controls (Pin, Fullscreen, Stop share)
              Positioned(
                top: 8,
                right: 8,
                child: AnimatedOpacity(
                  opacity: controlsOpacity,
                  duration: const Duration(milliseconds: 150),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                      child: Container(
                        color: Colors.black.withValues(alpha: 0.45),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 2,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (!widget.isFullScreen)
                              IconButton(
                                icon: AppHugeIcon(
                                  icon: widget.isPinned
                                      ? HugeIcons.strokeRoundedPinOff
                                      : HugeIcons.strokeRoundedPin,
                                  color: widget.isPinned
                                      ? colorScheme.primary
                                      : Colors.white,
                                  size: 18,
                                ),
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.all(6),
                                tooltip: widget.isPinned
                                    ? l10n.commsUnpin
                                    : l10n.commsPin,
                                onPressed: widget.onPin,
                              ),
                            IconButton(
                              icon: AppHugeIcon(
                                icon: widget.isFullScreen
                                    ? HugeIcons.strokeRoundedArrowShrink01
                                    : HugeIcons.strokeRoundedArrowExpand01,
                                color: Colors.white,
                                size: 18,
                              ),
                              visualDensity: VisualDensity.compact,
                              padding: const EdgeInsets.all(6),
                              tooltip: widget.isFullScreen
                                  ? l10n.commsExitFullScreen
                                  : l10n.commsFullScreen,
                              onPressed: widget.onFullScreen,
                            ),
                            if (tile.isScreenShare &&
                                !tile.isLocal &&
                                tile.trackSid != null)
                              Builder(
                                builder: (btnContext) => IconButton(
                                  icon: const AppHugeIcon(
                                    icon:
                                        HugeIcons.strokeRoundedSlidersVertical,
                                    color: Colors.white,
                                    size: 18,
                                  ),
                                  visualDensity: VisualDensity.compact,
                                  padding: const EdgeInsets.all(6),
                                  tooltip: l10n.screenShareQualityTooltip,
                                  onPressed: () {
                                    final box = btnContext.findRenderObject()
                                        as RenderBox?;
                                    final pos = box?.localToGlobal(
                                          Offset(0, box.size.height + 4),
                                        ) ??
                                        Offset.zero;
                                    showRemoteScreenShareQualityMenu(
                                      context: context,
                                      ref: ref,
                                      trackSid: tile.trackSid!,
                                      anchor: pos,
                                    );
                                  },
                                ),
                              ),
                            if (tile.isScreenShare &&
                                tile.isLocal &&
                                widget.onEditShare != null)
                              IconButton(
                                icon: const AppHugeIcon(
                                  icon: HugeIcons.strokeRoundedPencilEdit02,
                                  color: Colors.white,
                                  size: 18,
                                ),
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.all(6),
                                tooltip: l10n.screenShareEditShare,
                                onPressed: widget.onEditShare,
                              ),
                            if (tile.isScreenShare &&
                                tile.isLocal &&
                                widget.onStopShare != null)
                              IconButton(
                                icon: const AppHugeIcon(
                                  icon: HugeIcons.strokeRoundedComputerRemove,
                                  color: AppColors.danger,
                                  size: 18,
                                ),
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.all(6),
                                tooltip: l10n.commsStopScreenShare,
                                onPressed: widget.onStopShare,
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // Bottom-left name tag
              Positioned(
                left: 10,
                bottom: 10,
                child: AnimatedOpacity(
                  opacity: widget.isFullScreen ? controlsOpacity : 1.0,
                  duration: const Duration(milliseconds: 150),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                      child: Container(
                        color: Colors.black.withValues(alpha: 0.45),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (tile.isScreenShare) ...[
                              const Icon(
                                Icons.screen_share_rounded,
                                size: 14,
                                color: Colors.white70,
                              ),
                              const SizedBox(width: 5),
                            ],
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 160),
                              child: Text(
                                labelText,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              // Bottom-right cluster: mute badges + quick camera flip.
              // The flip button stays mobile-local-video-only; mute badges
              // show on every platform. No long-press is used anywhere.
              if (showLocalLock ||
                  showRemoteSimple ||
                  (tile.isLocal &&
                      !tile.isScreenShare &&
                      videoTrack != null &&
                      currentPlatform == AppPlatform.mobile))
                Positioned(
                  right: 10,
                  bottom: 10,
                  child: AnimatedOpacity(
                    opacity: widget.isFullScreen ? controlsOpacity : 1.0,
                    duration: const Duration(milliseconds: 150),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                        child: Container(
                          color: Colors.black.withValues(alpha: 0.45),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 2,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (showLocalLock)
                                Tooltip(
                                  message: l10n.commsUnmuteUser,
                                  child: const Padding(
                                    padding: EdgeInsets.all(6),
                                    child: AppHugeIcon(
                                      icon: HugeIcons.strokeRoundedMicOff02,
                                      color: Colors.white,
                                      size: 18,
                                    ),
                                  ),
                                )
                              else if (showRemoteSimple)
                                const Padding(
                                  padding: EdgeInsets.all(6),
                                  child: AppHugeIcon(
                                    icon: HugeIcons.strokeRoundedMicOff02,
                                    color: AppColors.danger,
                                    size: 18,
                                  ),
                                ),
                              if (tile.isLocal &&
                                  !tile.isScreenShare &&
                                  videoTrack != null &&
                                  currentPlatform == AppPlatform.mobile)
                                IconButton(
                                  icon: const AppHugeIcon(
                                    icon:
                                        HugeIcons.strokeRoundedCameraRotated01,
                                    color: Colors.white,
                                    size: 18,
                                  ),
                                  visualDensity: VisualDensity.compact,
                                  padding: const EdgeInsets.all(6),
                                  tooltip: l10n.commsSwitchCamera,
                                  onPressed: () => ref
                                      .read(commsProvider.notifier)
                                      .switchCamera(),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatarFallback(
    BuildContext context,
    String? pfpUUID,
    String displayName,
  ) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).colorScheme.surfaceContainerHighest
                .withValues(alpha: 0.8),
            Theme.of(context).colorScheme.surface.withValues(alpha: 0.9),
          ],
        ),
      ),
      child: Center(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final cardMinDim = constraints.maxWidth < constraints.maxHeight
                ? constraints.maxWidth
                : constraints.maxHeight;
            final avatarSize = (cardMinDim * 0.35).clamp(36.0, 96.0);

            return Avatar(uuid: pfpUUID, name: displayName, size: avatarSize);
          },
        ),
      ),
    );
  }
}

/// Passive double-tap detector for the card background.
class _DoubleTapBackground extends StatefulWidget {
  final Widget child;
  final ValueChanged<Offset> onDoubleTap;

  const _DoubleTapBackground({
    required this.child,
    required this.onDoubleTap,
  });

  @override
  State<_DoubleTapBackground> createState() => _DoubleTapBackgroundState();
}

class _DoubleTapBackgroundState extends State<_DoubleTapBackground> {
  static const _timeout = Duration(milliseconds: 300);
  static const _slop = 48.0;

  DateTime? _lastDownAt;
  Offset? _lastDownPos;

  void _onPointerDown(PointerDownEvent event) {
    if (event.buttons != kPrimaryButton) return;
    final now = DateTime.now();
    final prevAt = _lastDownAt;
    final prevPos = _lastDownPos;
    _lastDownAt = now;
    _lastDownPos = event.position;
    if (prevAt != null &&
        prevPos != null &&
        now.difference(prevAt) <= _timeout &&
        (event.position - prevPos).distance <= _slop) {
      _lastDownAt = null;
      _lastDownPos = null;
      widget.onDoubleTap(event.position);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: _onPointerDown,
      child: widget.child,
    );
  }
}
