part of '../comms_controller.dart';

/// Connection lifecycle: join / leave / room listeners.
mixin CommsConnectionMixin
    on
        Notifier<CommsState>,
        CommsDevicesLiveMixin,
        CommsViewStateMixin,
        CommsVolumesMixin {
  EventsListener<RoomEvent>? _roomListener;
  bool _isLeaving = false;
  Timer? _speakingDebounce;
  Set<String>? _pendingSpeakers;

  @override
  bool get _isDisposed;

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
        roomOptions: RoomOptions(
          adaptiveStream: true,
          dynacast: true,
          defaultAudioPublishOptions: const AudioPublishOptions(dtx: true),
          defaultVideoPublishOptions: const VideoPublishOptions(
            simulcast: true,
          ),
          defaultAudioCaptureOptions: AudioCaptureOptions(
            deviceId: CommsDevicesDefaults.resolveLiveKitDeviceId(
              _savedDeviceId(CommsDevicesDefaults.kAudioInputKey),
            ),
          ),
          defaultCameraCaptureOptions: CameraCaptureOptions(
            deviceId: CommsDevicesDefaults.resolveLiveKitDeviceId(
              _savedDeviceId(CommsDevicesDefaults.kVideoInputKey),
            ),
          ),
          defaultAudioOutputOptions: AudioOutputOptions(
            deviceId: CommsDevicesDefaults.resolveLiveKitDeviceId(
              _savedDeviceId(CommsDevicesDefaults.kAudioOutputKey),
            ),
          ),
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

      // Route playout to the saved output device
      try {
        await CommsDevicesPlatform.applyAudioOutput(
          room: newRoom,
          savedId: _savedDeviceId(CommsDevicesDefaults.kAudioOutputKey),
        );
      } catch (e) {
        debugPrint('[CommsController] Error applying audio output: $e');
      }

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
          await newRoom?.localParticipant?.setMicrophoneEnabled(
            true,
            audioCaptureOptions: AudioCaptureOptions(
              deviceId: CommsDevicesDefaults.resolveLiveKitDeviceId(
                _savedDeviceId(CommsDevicesDefaults.kAudioInputKey),
              ),
            ),
          );
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
        _pendingSpeakers = event.speakers.map((p) => p.identity).toSet();
        _speakingDebounce ??= Timer(const Duration(milliseconds: 300), () {
          _speakingDebounce = null;
          final pending = _pendingSpeakers;
          _pendingSpeakers = null;
          if (pending != null &&
              !_isDisposed &&
              !setEquals(state.speakingParticipants, pending)) {
            state = state.copyWith(speakingParticipants: pending);
          }
        });
      })
      ..on<TrackSubscribedEvent>((event) {
        if (event.track.source == TrackSource.screenShareVideo) {
          SoundPlayer.instance.playSound('comms.screen_share.start');
        }
        unawaited(_applyAudioOutputTrack(event.track));
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

  /// Disconnects from the current vocal room and resets state safely.
  Future<void> leave() async {
    if (_isLeaving) return;
    _isLeaving = true;

    _speakingDebounce?.cancel();
    _speakingDebounce = null;
    _pendingSpeakers = null;

    // Flush pending volume writes, then keep saved volumes across rooms.
    await _persistVolumesNow();
    final savedVolumes = state.remoteVolumes;

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

    state = CommsState(remoteVolumes: savedVolumes);
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
}
