import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/comms/comms_user_context_menu.dart';
import 'package:novyse/ui/components/comms/remote_screen_share_quality_menu.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
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
    this.onEditShare
  });

  @override
  ConsumerState<CommsUserCard> createState() => _CommsUserCardState();
}

class _CommsUserCardState extends ConsumerState<CommsUserCard> {
  static const _autoHideDuration = Duration(seconds: 3);

  /// Corner radius of the tile. Shared by the clip, the background and the
  /// border so the three always describe the same shape.
  static const _tileRadius = 24.0;

  /// Touch box of the small overlay buttons (pin, fullscreen, ...).
  static const _chipButtonSize = 32.0;

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
    final status = context.statusColors;

    // Mute badges (bottom-right):
    // - mic-with-lock: local-only mute from this client's context menu.
    // - plain mic-off: remote self-mute broadcast by LiveKit (bottombar),
    //   or own mic state for the local tile when connected to comms.
    final activeChat = ref.watch(activeChatProvider);
    final targetChatUUID = activeChat.selectedChatUUID;
    final targetSub = activeChat.selectedSub;
    final isCommsConnected = ref.watch(
      commsProvider.select(
        (s) => targetChatUUID != null
            ? s.isRoomMatch(targetChatUUID, targetSub)
            : s.connected,
      ),
    );
    final ownMicOff = tile.isLocal && !tile.isScreenShare && isCommsConnected
        ? !ref.watch(commsProvider.select((s) => s.isAudioEnabled))
        : false;
    final showLocalLock = tile.isLocallyMuted && !tile.isLocal;
    final showRemoteSimple =
        !showLocalLock && (tile.isRemoteMuted || ownMicOff);

    final isMuted = tile.isRemoteMuted || tile.isLocallyMuted || ownMicOff;
    final isSpeaking =
        tile.isSpeaking && !tile.isScreenShare && !isMuted;

    final controlsOpacity = !isCommsConnected
        ? 0.0
        : widget.isFullScreen
            ? (_overlayUiVisible ? 1.0 : 0.0)
            : ((_isHovered || widget.isPinned) ? 1.0 : 0.0);

    void openMenu(Offset anchor) {
      if (!isCommsConnected) return;
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

    final cardRadius = BorderRadius.circular(
      widget.isFullScreen ? 0 : _tileRadius,
    );
    final onEditShare = widget.onEditShare;
    final onStopShare = widget.onStopShare;

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: widget.isFullScreen ? _onCardTap : null,
      onTapUp: widget.isFullScreen || !isCommsConnected
          ? null
          : (details) => openMenu(details.globalPosition),
      onDoubleTap: widget.isFullScreen || !isCommsConnected
          ? null
          : widget.onPin,
      onSecondaryTapUp: !isCommsConnected
          ? null
          : (details) => openMenu(details.globalPosition),
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
            borderRadius: cardRadius,
            boxShadow: isSpeaking
                ? [
                    BoxShadow(
                      color: status.success.withValues(alpha: 0.4),
                      blurRadius: 16,
                      spreadRadius: 2,
                    ),
                  ]
                : null,
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
          ),
          foregroundDecoration: BoxDecoration(
            borderRadius: cardRadius,
            border: Border.all(
              color: isSpeaking
                  ? status.success
                  : colorScheme.outline.withValues(alpha: 0.25),
              width: isSpeaking ? 2.5 : 1,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Video or Avatar Content
              if (videoTrack != null)
                VideoTrackRenderer(videoTrack)
              else
                _buildAvatarFallback(context, pfpUUID, displayName),

              // Top-right controls (Pin, Fullscreen, Stop share)
              // Hidden entirely when previewing the room from outside.
              if (isCommsConnected)
                Positioned(
                  top: 8,
                  right: 8,
                  child: AnimatedOpacity(
                    opacity: controlsOpacity,
                    duration: const Duration(milliseconds: 150),
                    child: FloatingPill(
                      padding: const EdgeInsets.all(2),
                      enforceMinSize: false,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (!widget.isFullScreen)
                            _ChipIconButton(
                              icon: widget.isPinned
                                  ? HugeIcons.strokeRoundedPinOff
                                  : HugeIcons.strokeRoundedPin,
                              color: widget.isPinned
                                  ? colorScheme.primary
                                  : colorScheme.onSurfaceVariant,
                              tooltip: widget.isPinned
                                  ? l10n.commsUnpin
                                  : l10n.commsPin,
                              onPressed: widget.onPin,
                            ),
                          _ChipIconButton(
                            icon: widget.isFullScreen
                                ? HugeIcons.strokeRoundedArrowShrink01
                                : HugeIcons.strokeRoundedArrowExpand01,
                            tooltip: widget.isFullScreen
                                ? l10n.commsExitFullScreen
                                : l10n.commsFullScreen,
                            onPressed: widget.onFullScreen,
                          ),
                          if (tile.isScreenShare &&
                              !tile.isLocal &&
                              tile.trackSid != null)
                            Builder(
                              builder: (btnContext) => _ChipIconButton(
                                icon: HugeIcons.strokeRoundedSlidersVertical,
                                tooltip: l10n.screenShareQualityTooltip,
                                onPressed: () {
                                  final box =
                                      btnContext.findRenderObject()
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
                              onEditShare != null)
                            _ChipIconButton(
                              icon: HugeIcons.strokeRoundedPencilEdit02,
                              tooltip: l10n.screenShareEditShare,
                              onPressed: onEditShare,
                            ),
                          if (tile.isScreenShare &&
                              tile.isLocal &&
                              onStopShare != null)
                            _ChipIconButton(
                              icon:
                                  HugeIcons.strokeRoundedComputerRemove,
                              color: status.danger,
                              tooltip: l10n.commsStopScreenShare,
                              onPressed: onStopShare,
                            ),
                        ],
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
                  child: FloatingPill(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    enforceMinSize: false,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (tile.isScreenShare) ...[
                          Icon(
                            Icons.screen_share_rounded,
                            size: 14,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 6),
                        ],
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 160),
                          child: Text(
                            labelText,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: colorScheme.onSurface,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
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
                    child: FloatingPill(
                      padding: const EdgeInsets.all(2),
                      enforceMinSize: false,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (showLocalLock)
                            Tooltip(
                              message: l10n.commsUnmuteUser,
                              child: Padding(
                                padding: const EdgeInsets.all(7),
                                child: AppHugeIcon(
                                  icon: HugeIcons.strokeRoundedMicOff02,
                                  color: colorScheme.onSurfaceVariant,
                                  size: 18,
                                ),
                              ),
                            )
                          else if (showRemoteSimple)
                            Padding(
                              padding: const EdgeInsets.all(7),
                              child: AppHugeIcon(
                                icon: HugeIcons.strokeRoundedMicOff02,
                                color: status.danger,
                                size: 18,
                              ),
                            ),
                          if (tile.isLocal &&
                              isCommsConnected &&
                              !tile.isScreenShare &&
                              videoTrack != null &&
                              currentPlatform == AppPlatform.mobile)
                            _ChipIconButton(
                              icon:
                                  HugeIcons.strokeRoundedCameraRotated01,
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

/// Small round button for the overlay chips. 32px box, 18px icon —
/// same proportions as the 42/20 app-bar buttons, one step smaller.
class _ChipIconButton extends StatelessWidget {
  const _ChipIconButton({
    required this.icon,
    this.color,
    required this.tooltip,
    required this.onPressed,
  });

  final dynamic icon;
  final Color? color;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
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
            width: _CommsUserCardState._chipButtonSize,
            height: _CommsUserCardState._chipButtonSize,
            child: Center(
              child: AppHugeIcon(
                icon: icon,
                color: color ?? Theme.of(context).colorScheme.onSurfaceVariant,
                size: 18,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
