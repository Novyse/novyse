import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/stores/user_store.dart';

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
}

typedef CommsRoomKey = ({String chatUUID, int sub});

/// Family AutoDispose Notifier provider for room participants and tiles.
/// Intelligently switches between:
/// 1. Real-time LiveKit Room session (if connected to this exact room).
/// 2. Periodic REST polling every 5s via [apiGateway.comms.room.get] (if not connected or in another room).
class CommsDataNotifier
    extends AutoDisposeFamilyNotifier<CommsRoomViewData, CommsRoomKey> {
  Timer? _pollingTimer;

  @override
  CommsRoomViewData build(CommsRoomKey arg) {
    ref.onDispose(() {
      _stopPolling();
    });

    final commsState = ref.watch(commsProvider);
    final isMatch = commsState.isRoomMatch(arg.chatUUID, arg.sub);

    if (isMatch && commsState.room != null) {
      _stopPolling();
      return _buildTilesFromLiveRoom(commsState.room!);
    } else {
      _startPolling();
      return const CommsRoomViewData(isLoading: true);
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
      );

      final localUserUUID = ref.read(userStoreProvider).localUserUUID;

      final tiles = remoteData.participantUserUUIDs.map((uuid) {
        return CommsTileItem(
          id: uuid,
          userUUID: uuid,
          isScreenShare: false,
          isLocal: uuid == localUserUUID,
          videoTrack: null,
          isSpeaking: false,
          isMuted: false,
        );
      }).toList();

      state = CommsRoomViewData(
        isConnectedToThisRoom: false,
        tiles: tiles,
        isLoading: false,
      );
    } catch (e) {
      debugPrint('[CommsDataProvider] Error polling remote room: $e');
    }
  }

  CommsRoomViewData _buildTilesFromLiveRoom(Room room) {
    final commsState = ref.read(commsProvider);
    final tiles = <CommsTileItem>[];

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
          commsState.speakingParticipants.contains(identity) ||
          commsState.speakingParticipants.contains(userUUID) ||
          participant.isSpeaking;

      tiles.add(
        CommsTileItem(
          id: identity,
          userUUID: userUUID,
          isScreenShare: false,
          isLocal: isLocal,
          videoTrack: cameraPub?.track as VideoTrack?,
          isSpeaking: isSpeaking,
          isMuted: cameraPub?.muted ?? false,
        ),
      );

      // 2. Screen share tracks (support multiple 1..N screenshares per participant)
      final screenPubs = participant.videoTrackPublications.where(
        (p) => p.source == TrackSource.screenShareVideo,
      );

      for (final screenPub in screenPubs) {
        tiles.add(
          CommsTileItem(
            id: screenPub.sid,
            userUUID: userUUID,
            isScreenShare: true,
            isLocal: isLocal,
            videoTrack: screenPub.track as VideoTrack?,
            trackSid: screenPub.sid,
            isSpeaking: false,
            isMuted: screenPub.muted,
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
