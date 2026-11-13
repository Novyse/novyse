import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_data_provider.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/plugins/activity_controller.dart';
import 'package:novyse/core/plugins/models/activity_instance.dart';
import 'package:novyse/core/plugins/plugin_entry_provider.dart';
import 'package:novyse/core/plugins/ui/activity_tile.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/avatar/avatar_backdrop.dart';
import 'package:novyse/ui/components/comms/comms_tile_controls.dart';
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
    this.onEditShare,
  });

  @override
  ConsumerState<CommsUserCard> createState() => _CommsUserCardState();
}

class _CommsUserCardState extends ConsumerState<CommsUserCard> {
  static const _autoHideDuration = Duration(seconds: 3);

  /// Corner radius of the tile. Shared by the clip, the background and the
  /// border so the three always describe the same shape.
  static const _tileRadius = 24.0;

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

    final isCommsConnected = ref.watch(activeCommsRoomConnectedProvider);

    // An activity tile carries a plugin, not a participant: it keeps the same
    // frame and the same controls, and the sandbox replaces the video/avatar.
    final activity = tile.activity;
    if (activity != null) {
      return _buildActivityCard(
        context,
        activity,
        colorScheme,
        isCommsConnected,
      );
    }

    // Fetch user details solely via userUUID from the local store
    final user = ref.watch(userProvider(tile.userUUID));
    final displayName =
        user?.displayName ?? (tile.isLocal ? l10n.chatYou : l10n.user);
    final pfpUUID = user?.profilePictureUUID;

    final videoTrack = tile.hasActiveVideo ? tile.videoTrack : null;

    final labelText = tile.isScreenShare
        ? l10n.commsUserScreenShare(displayName)
        : tile.isLocal
        ? l10n.commsUserYou(displayName)
        : displayName;

    final status = context.statusColors;

    // Mute badges (bottom-right):
    // - mic-with-lock: local-only mute from this client's context menu.
    // - plain mic-off: remote self-mute broadcast by LiveKit (bottombar),
    //   or own mic state for the local tile when connected to comms.
    final ownMicOff = tile.isLocal && !tile.isScreenShare && isCommsConnected
        ? !ref.watch(commsProvider.select((s) => s.isAudioEnabled))
        : false;
    final showLocalLock = tile.isLocallyMuted && !tile.isLocal;
    final showRemoteSimple =
        !showLocalLock && (tile.isRemoteMuted || ownMicOff);

    final isMuted = tile.isRemoteMuted || tile.isLocallyMuted || ownMicOff;
    final isSpeaking = tile.isSpeaking && !tile.isScreenShare && !isMuted;

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
        child: Container(
          key: const ValueKey('comms_user_card_frame'),
          decoration: BoxDecoration(
            borderRadius: cardRadius,
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
          ),
          foregroundDecoration: BoxDecoration(
            borderRadius: cardRadius,
            border: Border.all(
              color: isSpeaking
                  ? status.success
                  : colorScheme.outline.withValues(alpha: 0.25),
              width: isSpeaking ? 2 : 1,
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
                _buildAvatarFallback(pfpUUID, displayName, tile.userUUID),

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
                      child: CommsTileControls(
                        isPinned: widget.isPinned,
                        isFullScreen: widget.isFullScreen,
                        onPin: widget.onPin,
                        onFullScreen: widget.onFullScreen,
                        trailing: [
                          if (tile.isScreenShare &&
                              !tile.isLocal &&
                              tile.trackSid != null)
                            Builder(
                              builder: (btnContext) => CommsChipIconButton(
                                icon: HugeIcons.strokeRoundedSlidersVertical,
                                tooltip: l10n.screenShareQualityTooltip,
                                onPressed: () {
                                  final box =
                                      btnContext.findRenderObject()
                                          as RenderBox?;
                                  final pos =
                                      box?.localToGlobal(
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
                            CommsChipIconButton(
                              icon: HugeIcons.strokeRoundedPencilEdit02,
                              tooltip: l10n.screenShareEditShare,
                              onPressed: onEditShare,
                            ),
                          if (tile.isScreenShare &&
                              tile.isLocal &&
                              onStopShare != null)
                            CommsChipIconButton(
                              icon: HugeIcons.strokeRoundedComputerRemove,
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
                            CommsChipIconButton(
                              icon: HugeIcons.strokeRoundedCameraRotated01,
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

  /// The card of an activity.
  ///
  /// Same frame, same radius, same controls of a participant card: the only
  /// difference is what fills it, the sandbox of the plugin instead of the
  /// video or the avatar. Keeping one card keeps the grid uniform when a room
  /// runs three activities and six people.
  Widget _buildActivityCard(
    BuildContext context,
    ActivityInstance instance,
    ColorScheme colorScheme,
    bool isCommsConnected,
  ) {
    final l10n = AppLocalizations.of(context)!;

    final readOnly = ref.watch(
      activityControllerProvider.select((state) => state.readOnly),
    );

    final entry = ref.watch(pluginEntryProvider(instance.slug)).valueOrNull;
    final pluginName = entry?.name ?? instance.slug;
    final badgeLabel = '$pluginName (${l10n.activitiesBadge})';

    void close() => unawaited(
      ref.read(activityControllerProvider.notifier).stop(instance.instanceId),
    );

    final controlsOpacity = !isCommsConnected
        ? 0.0
        : widget.isFullScreen
        ? (_overlayUiVisible ? 1.0 : 0.0)
        : ((_isHovered || widget.isPinned) ? 1.0 : 0.0);

    final cardRadius = BorderRadius.circular(
      widget.isFullScreen ? 0 : _tileRadius,
    );

    // Outside the room the activity is a presence, not a place: the card
    // shows who is running it, with no sandbox mounted and no way to take
    // part in it. Same frame and same fallback of a participant without a
    // video, icon in the middle and the name underneath.
    if (!isCommsConnected) {
      return Container(
        key: const ValueKey('comms_user_card_frame'),
        decoration: BoxDecoration(
          borderRadius: cardRadius,
          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
        ),
        foregroundDecoration: BoxDecoration(
          borderRadius: cardRadius,
          border: Border.all(
            color: colorScheme.outline.withValues(alpha: 0.25),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            _buildAvatarFallback(
              null,
              pluginName,
              instance.slug,
              imageUri: entry?.iconUrl,
            ),
            Positioned(
              left: 10,
              bottom: 10,
              child: FloatingPill(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 7,
                ),
                enforceMinSize: false,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 160),
                  child: Text(
                    badgeLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: widget.isFullScreen ? _onCardTap : null,
      onDoubleTap: widget.isFullScreen || !isCommsConnected
          ? null
          : widget.onPin,
      child: MouseRegion(
        onEnter: (_) {
          setState(() => _isHovered = true);
          if (widget.isFullScreen) _showOverlayUi();
        },
        onHover: (_) {
          if (widget.isFullScreen) _showOverlayUi();
        },
        onExit: (_) => setState(() => _isHovered = false),
        child: Container(
          key: const ValueKey('comms_user_card_frame'),
          decoration: BoxDecoration(
            borderRadius: cardRadius,
            color: Colors.black,
          ),
          foregroundDecoration: BoxDecoration(
            borderRadius: cardRadius,
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.25),
            ),
          ),
          child: ClipRRect(
            borderRadius: cardRadius,
            clipBehavior: Clip.antiAlias,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: Center(
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          // The plugin: installs the pinned build and mounts
                          // the sandbox.
                          ActivityTile(
                            key: ValueKey(instance.instanceId),
                            instance: instance,
                            onCommand: (command) {
                              final comms = ref.read(commsProvider.notifier);

                              switch (command.kind) {
                                case ActivityCommandKind.fullscreen:
                                  comms.setFullscreen(widget.tile.id);
                                case ActivityCommandKind.restore:
                                  comms.exitFullscreen();
                                case ActivityCommandKind.close:
                                  close();
                              }
                            },
                          ),

                          // Bottom-left: the plugin the tile is running.
                          Positioned(
                            left: 10,
                            bottom: 10,
                            child: AnimatedOpacity(
                              opacity: widget.isFullScreen
                                  ? controlsOpacity
                                  : 1.0,
                              duration: const Duration(milliseconds: 150),
                              child: FloatingPill(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 7,
                                ),
                                enforceMinSize: false,
                                child: ConstrainedBox(
                                  constraints: const BoxConstraints(
                                    maxWidth: 160,
                                  ),
                                  child: Text(
                                    badgeLabel,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: colorScheme.onSurface,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
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
                ),
                if (isCommsConnected)
                  CommsActivityControlRail(
                    isPinned: widget.isPinned,
                    isFullScreen: widget.isFullScreen,
                    readOnly: readOnly,
                    onClose: close,
                    onPin: widget.onPin,
                    onFullScreen: widget.onFullScreen,
                    onMore: (anchor) => showCommsUserContextMenu(
                      context: context,
                      tile: widget.tile,
                      displayName: badgeLabel,
                      isPinned: widget.isPinned,
                      isFullScreen: widget.isFullScreen,
                      anchor: anchor,
                      onPin: widget.onPin,
                      onFullScreen: widget.onFullScreen,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAvatarFallback(
    String? pfpUUID,
    String displayName,
    String userUUID, {
    String? imageUri,
  }) {
    final brightness = Theme.of(context).brightness;
    final List<Color>? extracted;

    if (pfpUUID != null && pfpUUID.isNotEmpty) {
      extracted = ref
          .watch(
            avatarBackdropGradientProvider((
              pfpUUID: pfpUUID,
              brightness: brightness,
            )),
          )
          .valueOrNull;
    } else if (imageUri != null && imageUri.isNotEmpty) {
      extracted = ref
          .watch(
            avatarBackdropUriGradientProvider((
              uri: imageUri,
              brightness: brightness,
            )),
          )
          .valueOrNull;
    } else {
      extracted = null;
    }
    final gradientColors =
        extracted ?? Avatar.gradientColorsFor(seed: userUUID);
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            for (final color in gradientColors) color.withValues(alpha: 0.55),
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

            return Avatar(
              uuid: pfpUUID,
              uri: imageUri,
              name: displayName,
              seedKey: userUUID,
              size: avatarSize,
            );
          },
        ),
      ),
    );
  }
}
