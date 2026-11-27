import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_audio.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/plugins/activity_controller.dart';
import 'package:novyse/core/plugins/models/activity_instance.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/stores/active_chat_store.dart';

/// Aggregated view data for a specific room (chatUUID, sub).
@immutable
class CommsRoomViewData {
  final bool isConnectedToThisRoom;
  final List<CommsTileItem> tiles;
  final bool isLoading;

  const CommsRoomViewData({
    this.isConnectedToThisRoom = false,
    this.tiles = const [],
    this.isLoading = false,
  });

  CommsRoomViewData copyWith({
    bool? isConnectedToThisRoom,
    List<CommsTileItem>? tiles,
    bool? isLoading,
  }) {
    return CommsRoomViewData(
      isConnectedToThisRoom:
          isConnectedToThisRoom ?? this.isConnectedToThisRoom,
      tiles: tiles ?? this.tiles,
      isLoading: isLoading ?? this.isLoading,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CommsRoomViewData &&
          runtimeType == other.runtimeType &&
          isConnectedToThisRoom == other.isConnectedToThisRoom &&
          isLoading == other.isLoading &&
          listEquals(tiles, other.tiles);

  @override
  int get hashCode =>
      Object.hash(isConnectedToThisRoom, isLoading, Object.hashAll(tiles));
}

/// Whether a screen-share publication still gets a tile.
bool sharePublicationHasTile({
  required bool videoHidden,
  required bool muted,
}) => videoHidden || !muted;

typedef CommsRoomKey = ({String chatUUID, int sub});

/// Family AutoDispose Notifier provider for room participants and tiles.
/// Intelligently switches between:
/// 1. Real-time LiveKit Room session (if connected to this exact room).
/// 2. Periodic REST polling every 5s via [apiGateway.comms.room.get] (if not connected or in another room).
class CommsDataNotifier
    extends AutoDisposeFamilyNotifier<CommsRoomViewData, CommsRoomKey> {
  Timer? _pollingTimer;
  List<CommsTileItem> _lastTiles = const [];

  @override
  CommsRoomViewData build(CommsRoomKey arg) {
    ref.onDispose(() {
      _stopPolling();
    });

    final commsState = ref.watch(commsProvider);
    final activities = ref.watch(activityControllerProvider);

    final isMatch = ref.watch(commsRoomConnectedProvider(arg));

    if (isMatch && commsState.room != null) {
      _stopPolling();
      return _buildTilesFromLiveRoom(
        commsState.room!,
        commsState.speakingParticipants,
        activities: activities.isRoom(arg.chatUUID, arg.sub)
            ? activities.instances
            : const [],
        remoteVolumes: commsState.remoteVolumes,
        localMuted: commsState.localMuted,
        outputEnabled: commsState.isAudioOutputEnabled,
        hiddenShareVideoSids: commsState.hiddenShareVideoSids,
      );
    } else {
      _startPolling();
      return CommsRoomViewData(
        isConnectedToThisRoom: false,
        tiles: _lastTiles,
        isLoading: _lastTiles.isEmpty,
      );
    }
  }

  void _startPolling() {
    if (_pollingTimer != null) return;

    // Fetch immediately
    unawaited(_fetchRemoteRoom());

    // Poll every 5 seconds
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      unawaited(_fetchRemoteRoom());
    });
  }

  void _stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> _fetchRemoteRoom() async {
    try {
      final result = await apiGateway.comms.room.get(
        arg.chatUUID,
        sub: arg.sub,
      );

      if (!result.success) return;

      final remoteData = CommsRoomRemoteData.fromApi(
        result.room,
        result.participants,
        rawActivities: result.activities,
      );

      // A room watched from outside is whatever the server says it is: the
      // account's own session can be a participant (another device), and
      // hiding it left the room with nothing but its activities.
      final tiles = <CommsTileItem>[
        for (final uuid in remoteData.participantUserUUIDs)
          CommsTileItem(
            id: uuid,
            userUUID: uuid,
            isScreenShare: false,
            isLocal: false,
            videoTrack: null,
            isSpeaking: false,
            isRemoteMuted: false,
          ),
        for (final share in remoteData.screenShares)
          CommsTileItem(
            id: screenShareTileId(share.trackSid),
            userUUID: share.ownerUUID,
            isScreenShare: true,
            trackSid: share.trackSid,
          ),
        for (final activity in remoteData.activities)
          CommsTileItem(
            id: 'activity:${activity.instanceId}',
            userUUID: '',
            activity: activity,
          ),
      ];

      _lastTiles = tiles;

      state = CommsRoomViewData(
        isConnectedToThisRoom: false,
        tiles: _lastTiles,
        isLoading: false,
      );
    } catch (e) {
      debugPrint('[CommsDataProvider] Error polling remote room: $e');
    }
  }

  CommsRoomViewData _buildTilesFromLiveRoom(
    Room room,
    Set<String> speakingParticipants, {
    List<ActivityInstance> activities = const [],
    Map<String, double> remoteVolumes = const {},
    Map<String, bool> localMuted = const {},
    bool outputEnabled = true,
    Set<String> hiddenShareVideoSids = const {},
  }) {
    final tiles = <CommsTileItem>[
      for (final instance in activities)
        CommsTileItem(
          id: 'activity:${instance.instanceId}',
          userUUID: '',
          activity: instance,
        ),
    ];

    final participants = <Participant>[
      if (room.localParticipant != null) room.localParticipant!,
      ...room.remoteParticipants.values,
    ];

    for (final participant in participants) {
      final identity = participant.identity;
      final userUUID = extractUserUUID(identity);
      final isLocal = participant is LocalParticipant;

      // 1. Camera track or avatar tile
      final cameraPub = participant.videoTrackPublications
          .where((p) => p.source == TrackSource.camera)
          .firstOrNull;

      final isSpeaking =
          speakingParticipants.contains(identity) ||
          speakingParticipants.contains(userUUID) ||
          participant.isSpeaking;

      // Remote mic mute as broadcast by LiveKit (visible to everyone).
      final micPub = participant.audioTrackPublications
          .where((p) => p.source == TrackSource.microphone)
          .firstOrNull;
      final remoteSelfMuted =
          !isLocal &&
          ((micPub?.muted ?? false) || !participant.isMicrophoneEnabled());

      final volKey = identity;
      final locallyMuted = !isLocal && (localMuted[volKey] ?? false);
      final effectiveVolume = CommsAudio.effectiveVolume(
        volume: remoteVolumes[volKey] ?? 1.0,
        locallyMuted: localMuted[volKey] ?? false,
        outputEnabled: outputEnabled,
      );

      tiles.add(
        CommsTileItem(
          id: identity,
          userUUID: userUUID,
          isScreenShare: false,
          isLocal: isLocal,
          videoTrack: cameraPub?.track as VideoTrack?,
          isSpeaking: isSpeaking,
          isRemoteMuted: remoteSelfMuted,
          isLocallyMuted: locallyMuted,
          effectiveVolume: effectiveVolume,
        ),
      );

      // 2. Screen share tracks (support multiple 1..N screenshares per participant)
      final screenPubs = participant.videoTrackPublications.where(
        (p) => p.source == TrackSource.screenShareVideo,
      );

      for (final screenPub in screenPubs) {
        if (!sharePublicationHasTile(
          videoHidden: hiddenShareVideoSids.contains(screenPub.sid),
          muted: screenPub.muted,
        )) {
          continue;
        }

        final shareVolKey = screenPub.sid;
        tiles.add(
          CommsTileItem(
            id: screenShareTileId(screenPub.sid),
            userUUID: userUUID,
            isScreenShare: true,
            isLocal: isLocal,
            videoTrack: screenPub.track as VideoTrack?,
            trackSid: screenPub.sid,
            isSpeaking: false,
            isRemoteMuted: screenPub.muted,
            isLocallyMuted: !isLocal && (localMuted[shareVolKey] ?? false),
            effectiveVolume: CommsAudio.effectiveVolume(
              volume: remoteVolumes[shareVolKey] ?? 1.0,
              locallyMuted: localMuted[shareVolKey] ?? false,
              outputEnabled: outputEnabled,
            ),
          ),
        );
      }
    }

    return CommsRoomViewData(
      isConnectedToThisRoom: true,
      tiles: tiles,
      isLoading: false,
    );
  }
}

final commsDataProvider =
    AutoDisposeNotifierProviderFamily<
      CommsDataNotifier,
      CommsRoomViewData,
      CommsRoomKey
    >(CommsDataNotifier.new);

/// Whether we are connected to the given room.
final commsRoomConnectedProvider = Provider.autoDispose
    .family<bool, CommsRoomKey>(
      (ref, room) => ref.watch(
        commsProvider.select((s) => s.isRoomMatch(room.chatUUID, room.sub)),
      ),
    );

/// Whether we are connected to the room open in the chat view.
final activeCommsRoomConnectedProvider = Provider.autoDispose<bool>((ref) {
  final activeChat = ref.watch(activeChatProvider);
  final chatUUID = activeChat.selectedChatUUID;
  if (chatUUID == null) {
    return ref.watch(commsProvider.select((s) => s.connected));
  }
  return ref.watch(
    commsRoomConnectedProvider((
      chatUUID: chatUUID,
      sub: activeChat.selectedSub,
    )),
  );
});
