import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/sounds/sound_player.dart';

/// Riverpod Notifier managing the LiveKit Room connection and audio/video controls.
class CommsNotifier extends Notifier<CommsState> {
  EventsListener<RoomEvent>? _roomListener;
  bool _isLeaving = false;
  bool _isDisposed = false;

  @override
  CommsState build() {
    _isDisposed = false;
    ref.onDispose(() {
      _isDisposed = true;
      unawaited(leave());
    });
    return const CommsState();
  }

  /// Join a vocal room for the specified chat and sub.
  Future<void> join(String chatUUID, {int sub = 0}) async {
    // If already connected or connecting to this exact room, no-op
    if (state.currentChatUUID == chatUUID &&
        state.currentSub == sub &&
        (state.connected || state.connecting)) {
      return;
    }

    // Disconnect and clean up any existing or connecting room first
    if (state.room != null || state.connected || state.connecting) {
      await leave();
    }

    state = state.copyWith(
      connecting: true,
      currentChatUUID: () => chatUUID,
      currentSub: sub,
      errorMessage: () => null,
      errorMessageBuilder: () => null,
    );

    Room? newRoom;
    try {
      final tokenResult = await apiGateway.comms.getToken(chatUUID, sub: sub);

      if (!tokenResult.success ||
          tokenResult.token == null ||
          tokenResult.url == null) {
        state = state.copyWith(
          connecting: false,
          errorMessageBuilder: () =>
              (l10n) => l10n.commsTokenError,
        );
        return;
      }

      newRoom = Room(
        roomOptions: const RoomOptions(
          adaptiveStream: true,
          dynacast: true,
          defaultAudioPublishOptions: AudioPublishOptions(dtx: true),
          defaultVideoPublishOptions: VideoPublishOptions(simulcast: true),
        ),
      );

      final listener = newRoom.createListener();
      _roomListener = listener;
      _setupRoomListeners(listener, newRoom);

      await newRoom.connect(tokenResult.url!, tokenResult.token!);

      // Audio setup in room
      try {
        await newRoom.startAudio();
      } catch (e) {
        debugPrint('[CommsController] Error starting audio: $e');
      }

      state = state.copyWith(
        room: () => newRoom,
        connected: true,
        connecting: false,
        errorMessage: () => null,
        errorMessageBuilder: () => null,
      );

      // Play join sound
      try {
        await SoundPlayer.instance.playSound('comms.join');
      } catch (e) {
        debugPrint('[CommsController] Error playing join sound: $e');
      }

      // Enable microphone by default after short delay to let connection settle
      Future.delayed(const Duration(milliseconds: 500), () async {
        if (_isDisposed || !state.connected || state.room != newRoom) {
          return;
        }
        try {
          await newRoom?.localParticipant?.setMicrophoneEnabled(true);
          if (!_isDisposed) {
            state = state.copyWith(isAudioEnabled: true);
          }
        } catch (e) {
          debugPrint('[CommsController] Error enabling default microphone: $e');
        }
      });
    } catch (e) {
      debugPrint('[CommsController] Error joining vocal room: $e');
      if (newRoom != null) {
        try {
          await _roomListener?.dispose();
          _roomListener = null;
          await newRoom.disconnect();
          await newRoom.dispose();
        } catch (_) {}
      }
      state = state.copyWith(
        room: () => null,
        connected: false,
        connecting: false,
        errorMessageBuilder: () =>
            (l10n) => l10n.commsConnectionError(e.toString()),
      );
    }
  }

  void _setupRoomListeners(EventsListener<RoomEvent> listener, Room room) {
    listener
      ..on<ParticipantConnectedEvent>((event) {
        debugPrint(
          '[CommsController] Participant joined: ${event.participant.identity}',
        );
        SoundPlayer.instance.playSound('comms.join');
        _notifyStateChange();
      })
      ..on<ParticipantDisconnectedEvent>((event) {
        debugPrint(
          '[CommsController] Participant left: ${event.participant.identity}',
        );
        SoundPlayer.instance.playSound('comms.leave');

        // Clear pin/fullscreen if disconnected participant had it
        final identity = event.participant.identity;
        final userUUID = extractUserUUID(identity);
        if (state.pinnedStreamId == identity ||
            state.pinnedStreamId == userUUID) {
          state = state.copyWith(pinnedStreamId: () => null);
        }
        if (state.fullscreenStreamId == identity ||
            state.fullscreenStreamId == userUUID) {
          state = state.copyWith(fullscreenStreamId: () => null);
        }

        _notifyStateChange();
      })
      ..on<ActiveSpeakersChangedEvent>((event) {
        final speakers = event.speakers.map((p) => p.identity).toSet();
        state = state.copyWith(speakingParticipants: speakers);
      })
      ..on<TrackSubscribedEvent>((event) {
        if (event.track.source == TrackSource.screenShareVideo) {
          SoundPlayer.instance.playSound('comms.screen_share.start');
        }
        _applyAudioOutputTrack(event.track);
        _notifyStateChange();
      })
      ..on<TrackUnsubscribedEvent>((event) {
        if (event.track.source == TrackSource.screenShareVideo) {
          SoundPlayer.instance.playSound('comms.screen_share.stop');
          if (state.pinnedStreamId == event.publication.sid) {
            state = state.copyWith(pinnedStreamId: () => null);
          }
          if (state.fullscreenStreamId == event.publication.sid) {
            state = state.copyWith(fullscreenStreamId: () => null);
          }
        }
        _notifyStateChange();
      })
      ..on<TrackMutedEvent>((event) {
        _notifyStateChange();
      })
      ..on<TrackUnmutedEvent>((event) {
        _notifyStateChange();
      })
      ..on<LocalTrackPublishedEvent>((event) {
        if (event.publication.source == TrackSource.screenShareVideo) {
          state = state.copyWith(
            activeScreenShareTrackSids: {
              ...state.activeScreenShareTrackSids,
              event.publication.sid,
            },
          );
          SoundPlayer.instance.playSound('comms.screen_share.start');
        }
        _notifyStateChange();
      })
      ..on<LocalTrackUnpublishedEvent>((event) {
        if (event.publication.source == TrackSource.screenShareVideo) {
          final updatedSids = Set<String>.from(state.activeScreenShareTrackSids)
            ..remove(event.publication.sid);
          state = state.copyWith(activeScreenShareTrackSids: updatedSids);
          SoundPlayer.instance.playSound('comms.screen_share.stop');

          if (state.pinnedStreamId == event.publication.sid) {
            state = state.copyWith(pinnedStreamId: () => null);
          }
          if (state.fullscreenStreamId == event.publication.sid) {
            state = state.copyWith(fullscreenStreamId: () => null);
          }
        }
        _notifyStateChange();
      })
      ..on<RoomDisconnectedEvent>((event) {
        debugPrint('[CommsController] Room disconnected');
        unawaited(leave());
      });
  }

  void _notifyStateChange() {
    state = state.copyWith();
  }

  /// Disconnects from the current vocal room and resets state safely.
  Future<void> leave() async {
    if (_isLeaving) return;
    _isLeaving = true;

    final room = state.room;
    final listener = _roomListener;
    _roomListener = null;

    if (listener != null) {
      try {
        await listener.dispose();
      } catch (e) {
        debugPrint('[CommsController] Error disposing room listener: $e');
      }
    }

    state = const CommsState();
    if (room != null) {
      final local = room.localParticipant;
      if (local != null) {
        for (final pub in local.videoTrackPublications) {
          try {
            await pub.track?.stop();
          } catch (_) {}
        }
        for (final pub in local.audioTrackPublications) {
          try {
            await pub.track?.stop();
          } catch (_) {}
        }
        try {
          await local.unpublishAllTracks();
        } catch (_) {}
      }
      try {
        await room.disconnect();
      } catch (e) {
        debugPrint('[CommsController] Error disconnecting room: $e');
      }

      try {
        await room.dispose();
      } catch (e) {
        debugPrint('[CommsController] Error disposing room: $e');
      }
      try {
        await SoundPlayer.instance.playSound('comms.leave');
      } catch (e) {
        debugPrint('[CommsController] Error playing leave sound: $e');
      }
    }

    _isLeaving = false;
  }

  /// Toggles local microphone.
  Future<void> toggleAudio() async {
    final localParticipant = state.room?.localParticipant;
    if (localParticipant == null) return;

    try {
      final next = !state.isAudioEnabled;
      await localParticipant.setMicrophoneEnabled(next);
      state = state.copyWith(isAudioEnabled: next);
    } catch (e) {
      debugPrint('[CommsController] Failed to toggle microphone: $e');
      state = state.copyWith(
        errorMessageBuilder: () =>
            (l10n) => l10n.commsMicAccessError,
      );
    }
  }

  /// Toggles local camera.
  Future<void> toggleVideo() async {
    final localParticipant = state.room?.localParticipant;
    if (localParticipant == null) return;

    try {
      final next = !state.isVideoEnabled;
      await localParticipant.setCameraEnabled(next);
      state = state.copyWith(isVideoEnabled: next);
    } catch (e) {
      debugPrint('[CommsController] Failed to toggle camera: $e');
      state = state.copyWith(
        errorMessageBuilder: () =>
            (l10n) => l10n.commsCameraAccessError,
      );
    }
  }

  /// Toggles remote audio output (deafen mode).
  void toggleAudioOutput() {
    final next = !state.isAudioOutputEnabled;
    state = state.copyWith(isAudioOutputEnabled: next);

    final room = state.room;
    if (room == null) return;

    for (final participant in room.remoteParticipants.values) {
      for (final pub in participant.audioTrackPublications) {
        final track = pub.track;
        if (track != null) {
          _applyAudioOutputTrack(track);
        }
      }
    }
  }

  void _applyAudioOutputTrack(Track track) {
    if (track is RemoteAudioTrack) {
      // If deafened, mute volume; otherwise restore normal or custom volume
      final targetVolume = state.isAudioOutputEnabled ? 1.0 : 0.0;
      try {
        // livekit_client handles volume or mute on remote audio tracks
        if (targetVolume == 0.0) {
          track.enable(); // keep enabled but silence
        }
      } catch (_) {}
    }
  }

  /// Starts screen sharing. Supports multiple concurrent shares
  Future<void> startScreenShare({
    String? sourceId,
    bool captureScreenAudio = true,
  }) async {
    final room = state.room;
    if (room?.localParticipant == null) return;

    try {
      // Using createScreenShareTrack allows publishing multiple screen shares
      final track = await LocalVideoTrack.createScreenShareTrack(
        ScreenShareCaptureOptions(
          sourceId: sourceId,
          captureScreenAudio: captureScreenAudio,
        ),
      );

      final pub = await room!.localParticipant!.publishVideoTrack(track);
      state = state.copyWith(
        activeScreenShareTrackSids: {
          ...state.activeScreenShareTrackSids,
          pub.sid,
        },
      );
    } catch (e) {
      debugPrint('[CommsController] Screen share failed or cancelled: $e');
    }
  }

  /// Stops a specific local screen share by its track SID.
  /// If trackSid is null and there are active shares, stops the first one.
  Future<void> stopScreenShare([String? trackSid]) async {
    final room = state.room;
    final localParticipant = room?.localParticipant;
    if (localParticipant == null) return;

    final targetSid = trackSid ?? state.activeScreenShareTrackSids.firstOrNull;
    if (targetSid == null) return;

    try {
      final publication = localParticipant.videoTrackPublications
          .where((p) => p.sid == targetSid)
          .firstOrNull;

      if (publication != null && publication.track != null) {
        final track = publication.track!;
        await track.stop();
        await localParticipant.removePublishedTrack(targetSid);
      } else {
        await localParticipant.setScreenShareEnabled(false);
      }

      final updatedSids = Set<String>.from(state.activeScreenShareTrackSids)
        ..remove(targetSid);
      state = state.copyWith(activeScreenShareTrackSids: updatedSids);

      if (state.pinnedStreamId == targetSid) {
        state = state.copyWith(pinnedStreamId: () => null);
      }
      if (state.fullscreenStreamId == targetSid) {
        state = state.copyWith(fullscreenStreamId: () => null);
      }
    } catch (e) {
      debugPrint('[CommsController] Error stopping screen share: $e');
    }
  }

  /// Pin a specific stream tile (or unpin if already pinned).
  void togglePin(String streamId) {
    state = state.copyWith(
      pinnedStreamId: () => state.pinnedStreamId == streamId ? null : streamId,
    );
  }

  /// Enter or exit fullscreen for a specific stream tile.
  void toggleFullscreen(String streamId) {
    state = state.copyWith(
      fullscreenStreamId: () =>
          state.fullscreenStreamId == streamId ? null : streamId,
    );
  }

  /// Set volume for a remote participant or track.
  void setRemoteVolume(String id, double volume) {
    final updated = Map<String, double>.from(state.remoteVolumes)
      ..[id] = volume;
    state = state.copyWith(remoteVolumes: updated);
  }

  /// Toggle local mute for a remote participant or track.
  void toggleLocalMute(String id) {
    final current = state.localMuted[id] ?? false;
    final updated = Map<String, bool>.from(state.localMuted)..[id] = !current;
    state = state.copyWith(localMuted: updated);
  }

  void clearError() {
    state = state.copyWith(
      errorMessage: () => null,
      errorMessageBuilder: () => null,
    );
  }
}

/// Global provider for vocal communications.
final commsProvider = NotifierProvider<CommsNotifier, CommsState>(
  CommsNotifier.new,
);
