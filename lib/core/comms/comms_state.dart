import 'package:flutter/foundation.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_share_config.dart';
import 'package:novyse/core/l10n/l10n.dart';

/// Immutable state representing active vocal chat session.
@immutable
class CommsState {
  final Room? room;
  final bool connected;
  final bool connecting;
  final String? currentChatUUID;
  final int currentSub;

  /// Hardware states
  final bool isAudioEnabled; // Local microphone
  final bool isVideoEnabled; // Local camera
  final bool isAudioOutputEnabled; // Remote audio output (deafen toggle)

  /// View states
  final String? pinnedStreamId;
  final String? fullscreenStreamId;

  /// Active local screen share track SIDs
  final Set<String> activeScreenShareTrackSids;

  /// Screen-share audio publication SID by video publication SID.
  /// Screen audio is published as a separate track;
  final Map<String, String> screenShareAudioSids;

  /// Desktop capture source id by screen-share video publication SID.
  /// Used to restart an active share in place when the source or the
  /// capture resolution changes.
  /// Empty when the OS/native picker chose the source (web, Wayland native picker).
  final Map<String, String> screenShareSourceIds;

  /// Per-share config (quality mode + custom quality/fps) by video SID.
  final Map<String, ScreenShareConfig> screenShareConfigs;

  /// Subscribed video quality per remote screen-share video track SID.
  /// Values: 'auto', 'high', 'medium', 'low' (defaults to 'auto').
  final Map<String, String> remoteScreenShareQualities;

  /// Identities/UUIDs of currently speaking participants
  final Set<String> speakingParticipants;

  /// Custom volumes per participant or track
  /// (linear gain: 0.0 muted, 1.0 unity, up to 3.0 boosted)
  final Map<String, double> remoteVolumes;

  /// Local mute toggles per participant or track
  final Map<String, bool> localMuted;

  /// Status or error message
  final String? errorMessage;
  final String Function(AppLocalizations)? errorMessageBuilder;

  const CommsState({
    this.room,
    this.connected = false,
    this.connecting = false,
    this.currentChatUUID,
    this.currentSub = 0,
    this.isAudioEnabled = false,
    this.isVideoEnabled = false,
    this.isAudioOutputEnabled = true,
    this.pinnedStreamId,
    this.fullscreenStreamId,
    this.activeScreenShareTrackSids = const {},
    this.screenShareAudioSids = const {},
    this.screenShareSourceIds = const {},
    this.screenShareConfigs = const {},
    this.remoteScreenShareQualities = const {},
    this.speakingParticipants = const {},
    this.remoteVolumes = const {},
    this.localMuted = const {},
    this.errorMessage,
    this.errorMessageBuilder,
  });

  bool isRoomMatch(String chatUUID, int sub) {
    return connected && currentChatUUID == chatUUID && currentSub == sub;
  }

  bool get isScreenSharing => activeScreenShareTrackSids.isNotEmpty;

  CommsState copyWith({
    Room? Function()? room,
    bool? connected,
    bool? connecting,
    String? Function()? currentChatUUID,
    int? currentSub,
    bool? isAudioEnabled,
    bool? isVideoEnabled,
    bool? isAudioOutputEnabled,
    String? Function()? pinnedStreamId,
    String? Function()? fullscreenStreamId,
    Set<String>? activeScreenShareTrackSids,
    Map<String, String>? screenShareAudioSids,
    Map<String, String>? screenShareSourceIds,
    Map<String, ScreenShareConfig>? screenShareConfigs,
    Map<String, String>? remoteScreenShareQualities,
    Set<String>? speakingParticipants,
    Map<String, double>? remoteVolumes,
    Map<String, bool>? localMuted,
    String? Function()? errorMessage,
    String Function(AppLocalizations)? Function()? errorMessageBuilder,
  }) {
    return CommsState(
      room: room != null ? room() : this.room,
      connected: connected ?? this.connected,
      connecting: connecting ?? this.connecting,
      currentChatUUID: currentChatUUID != null
          ? currentChatUUID()
          : this.currentChatUUID,
      currentSub: currentSub ?? this.currentSub,
      isAudioEnabled: isAudioEnabled ?? this.isAudioEnabled,
      isVideoEnabled: isVideoEnabled ?? this.isVideoEnabled,
      isAudioOutputEnabled: isAudioOutputEnabled ?? this.isAudioOutputEnabled,
      pinnedStreamId: pinnedStreamId != null
          ? pinnedStreamId()
          : this.pinnedStreamId,
      fullscreenStreamId: fullscreenStreamId != null
          ? fullscreenStreamId()
          : this.fullscreenStreamId,
      activeScreenShareTrackSids:
          activeScreenShareTrackSids ?? this.activeScreenShareTrackSids,
      screenShareAudioSids: screenShareAudioSids ?? this.screenShareAudioSids,
      screenShareSourceIds:
          screenShareSourceIds ?? this.screenShareSourceIds,
      screenShareConfigs: screenShareConfigs ?? this.screenShareConfigs,
      remoteScreenShareQualities:
          remoteScreenShareQualities ?? this.remoteScreenShareQualities,
      speakingParticipants: speakingParticipants ?? this.speakingParticipants,
      remoteVolumes: remoteVolumes ?? this.remoteVolumes,
      localMuted: localMuted ?? this.localMuted,
      errorMessage: errorMessage != null ? errorMessage() : this.errorMessage,
      errorMessageBuilder: errorMessageBuilder != null
          ? errorMessageBuilder()
          : this.errorMessageBuilder,
    );
  }
}
