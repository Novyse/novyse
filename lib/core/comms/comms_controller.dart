import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_audio.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/comms/devices/comms_device.dart';
import 'package:novyse/core/comms/devices/comms_devices_controller.dart';
import 'package:novyse/core/comms/devices/comms_devices_platform.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/sounds/sound_player.dart';
import 'package:novyse/core/utils/platform.dart';

/// Riverpod Notifier managing the LiveKit Room connection and audio/video controls.
class CommsNotifier extends Notifier<CommsState> {
  EventsListener<RoomEvent>? _roomListener;
  bool _isLeaving = false;
  bool _isDisposed = false;
  Timer? _speakingDebounce;
  Set<String>? _pendingSpeakers;
  Timer? _volumesPersistDebounce;
  bool _volumesHydrated = false;

  /// Settings key holding the persisted per-member linear volumes.
  static const volumesSettingsKey = 'comms.remoteVolumes';
  static const maxPersistedVolumes = 200;
  static const volumesPersistDebounce = Duration(milliseconds: 500);

  @override
  CommsState build() {
    _isDisposed = false;
    ref.onDispose(() {
      _isDisposed = true;
      _volumesPersistDebounce?.cancel();
      _volumesPersistDebounce = null;
      unawaited(leave());
    });
    ref.listen<Map<String, Object?>>(settingsControllerProvider, (_, next) {
      _hydrateVolumes(next);
    });
    Future.microtask(() {
      if (_isDisposed) return;
      try {
        _hydrateVolumes(ref.read(settingsControllerProvider));
      } catch (_) {}
    });
    return const CommsState();
  }

  void _hydrateVolumes(Map<String, Object?> settings) {
    if (_isDisposed || _volumesHydrated || state.remoteVolumes.isNotEmpty) {
      return;
    }
    final saved = CommsAudio.parsePersistedVolumes(
      settings[volumesSettingsKey],
    );
    if (saved.isEmpty) return;
    _volumesHydrated = true;
    state = state.copyWith(remoteVolumes: saved);
  }

  String _savedDeviceId(String key) {
    try {
      final raw = ref.read(settingsControllerProvider)[key];
      if (raw is String && raw.isNotEmpty) return raw;
    } catch (_) {}
    // Fall back to live devices state (same persisted source).
    try {
      final devices = ref.read(commsDevicesProvider);
      return switch (key) {
        CommsDevicesDefaults.kAudioInputKey => devices.selectedAudioInputId,
        CommsDevicesDefaults.kAudioOutputKey => devices.selectedAudioOutputId,
        CommsDevicesDefaults.kVideoInputKey => devices.selectedVideoInputId,
        _ => CommsDevicesDefaults.kDefaultId,
      };
    } catch (_) {}
    return CommsDevicesDefaults.kDefaultId;
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

  void _notifyStateChange() {
    state = state.copyWith();
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

  /// Toggles local microphone.
  Future<void> toggleAudio() async {
    final localParticipant = state.room?.localParticipant;
    if (localParticipant == null) return;

    try {
      final next = !state.isAudioEnabled;
      await localParticipant.setMicrophoneEnabled(
        next,
        audioCaptureOptions: AudioCaptureOptions(
          deviceId: CommsDevicesDefaults.resolveLiveKitDeviceId(
            _savedDeviceId(CommsDevicesDefaults.kAudioInputKey),
          ),
        ),
      );
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
      await localParticipant.setCameraEnabled(
        next,
        cameraCaptureOptions: CameraCaptureOptions(
          deviceId: CommsDevicesDefaults.resolveLiveKitDeviceId(
            _savedDeviceId(CommsDevicesDefaults.kVideoInputKey),
          ),
        ),
      );
      state = state.copyWith(isVideoEnabled: next);
    } catch (e) {
      debugPrint('[CommsController] Failed to toggle camera: $e');
      state = state.copyWith(
        errorMessageBuilder: () =>
            (l10n) => l10n.commsCameraAccessError,
      );
    }
  }

  /// Persist + immediately apply a new microphone (live switch if publishing).
  Future<void> setAudioInputDevice(String deviceId) async {
    await ref.read(commsDevicesProvider.notifier).setAudioInput(deviceId);
    final local = state.room?.localParticipant;
    if (local == null) return;
    final target = CommsDevicesDefaults.resolveLiveKitDeviceId(deviceId);
    try {
      if (target != null) {
        for (final pub in local.audioTrackPublications.toList()) {
          final track = pub.track;
          if (track is LocalAudioTrack &&
              track.source == TrackSource.microphone) {
            await track.setDeviceId(target);
          }
        }
      } else {
        if (state.isAudioEnabled) {
          await local.setMicrophoneEnabled(false);
          await local.setMicrophoneEnabled(
            true,
            audioCaptureOptions: const AudioCaptureOptions(),
          );
        }
      }
    } catch (e) {
      debugPrint('[CommsController] Failed to switch microphone: $e');
    }
  }

  /// Persist + immediately apply a new camera (live switch if publishing).
  Future<void> setVideoInputDevice(String deviceId) async {
    await ref.read(commsDevicesProvider.notifier).setVideoInput(deviceId);
    final local = state.room?.localParticipant;
    if (local == null || !state.isVideoEnabled) return;
    final target = CommsDevicesDefaults.resolveLiveKitDeviceId(deviceId);
    try {
      final cameraTrack = _activeCameraTrack(local);
      if (cameraTrack == null) {
        // No camera track yet: republish path picks the saved device.
        await local.setCameraEnabled(false);
        await local.setCameraEnabled(
          true,
          cameraCaptureOptions: CameraCaptureOptions(deviceId: target),
        );
        return;
      }
      await _restartCameraTrack(cameraTrack, target);
    } catch (e) {
      debugPrint('[CommsController] Failed to switch camera: $e');
      state = state.copyWith(
        errorMessageBuilder: () =>
            (l10n) => l10n.commsCameraAccessError,
      );
    }
  }

  /// Restarts [track] on [deviceId] (`null` = OS default) and replaces the
  /// sender track so remote participants see the new camera.
  Future<void> _restartCameraTrack(
    LocalVideoTrack track,
    String? deviceId,
  ) async {
    if (deviceId != null) {
      final fastSwitch = currentPlatform == AppPlatform.mobile;
      try {
        await track.switchCamera(deviceId, fastSwitch: fastSwitch);
        return;
      } catch (e) {
        debugPrint(
          '[CommsController] Fast camera switch failed, restarting: $e',
        );
      }
      await track.switchCamera(deviceId);
    } else {
      await track.restartTrack(const CameraCaptureOptions());
      await track.replaceTrackForMultiCodecSimulcast(track.mediaStreamTrack);
    }
  }

  LocalVideoTrack? _activeCameraTrack(LocalParticipant local) {
    for (final pub in local.videoTrackPublications) {
      final track = pub.track;
      if (track is LocalVideoTrack && track.source == TrackSource.camera) {
        return track;
      }
    }
    return null;
  }

  /// Quickly flip to the next camera (front/back on mobile).
  /// No-op when not publishing video or with fewer than 2 cameras.
  /// Returns the newly selected device id, or null when nothing switched.
  Future<String?> switchCamera() async {
    if (state.room?.localParticipant == null || !state.isVideoEnabled) {
      return null;
    }
    List<MediaDevice> cameras;
    try {
      cameras = await Hardware.instance.videoInputs();
    } catch (e) {
      debugPrint('[CommsController] Failed to enumerate cameras: $e');
      return null;
    }
    final seen = <String>{};
    final ids = <String>[];
    for (final camera in cameras) {
      final id = camera.deviceId.trim();
      if (id.isEmpty ||
          id.toLowerCase() == CommsDevicesDefaults.kDefaultId ||
          !seen.add(id.toLowerCase())) {
        continue;
      }
      ids.add(id);
    }
    if (ids.length < 2) return null;

    final saved = _savedDeviceId(CommsDevicesDefaults.kVideoInputKey);
    final index = ids.indexOf(saved);
    final next = index == -1 ? ids.first : ids[(index + 1) % ids.length];
    await setVideoInputDevice(next);
    return next;
  }

  /// Persist + immediately route playout to a new output device.
  Future<void> setAudioOutputDevice(String deviceId) async {
    await ref.read(commsDevicesProvider.notifier).setAudioOutput(deviceId);
    await applySavedAudioOutput();
  }

  /// Re-apply the saved output device to all current remote tracks.
  Future<void> applySavedAudioOutput() async {
    final room = state.room;
    if (room == null) return;
    try {
      await CommsDevicesPlatform.applyAudioOutput(
        room: room,
        savedId: _savedDeviceId(CommsDevicesDefaults.kAudioOutputKey),
      );
    } catch (e) {
      debugPrint('[CommsController] Failed to apply audio output: $e');
    }
  }

  /// Toggles remote audio output (deafen mode).
  Future<void> toggleAudioOutput() async {
    final next = !state.isAudioOutputEnabled;
    state = state.copyWith(isAudioOutputEnabled: next);

    final room = state.room;
    if (room == null) return;

    for (final participant in room.remoteParticipants.values) {
      for (final pub in participant.audioTrackPublications) {
        final track = pub.track;
        if (track != null) {
          await _applyAudioOutputTrack(track);
        }
      }
    }
  }

  Future<void> _applyAudioOutputTrack(Track track) async {
    // Route fresh remote tracks to the saved output (web setSinkId).
    try {
      CommsDevicesPlatform.applyAudioOutputToTrack(
        track: track,
        savedOutputId: _savedDeviceId(CommsDevicesDefaults.kAudioOutputKey),
      );
    } catch (_) {}
    if (track is RemoteAudioTrack) {
      await CommsAudio.applyAll(
        room: state.room,
        volumes: state.remoteVolumes,
        muted: state.localMuted,
        outputEnabled: state.isAudioOutputEnabled,
      );
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

  /// Explicitly exit fullscreen (e.g. ESC pressed, tile gone, dispose).
  void exitFullscreen() {
    if (state.fullscreenStreamId == null) return;
    state = state.copyWith(fullscreenStreamId: () => null);
  }

  /// Set linear volume (0.0..1.0) for a remote participant or track.
  /// The value is applied immediately to matching LiveKit audio tracks.
  /// When [persist] is true (default) it is also saved to local settings
  /// with a short debounce; pass false for ephemeral keys such as
  /// screen-share track SIDs.
  Future<void> setRemoteVolume(
    String id,
    double volume, {
    bool persist = true,
  }) async {
    final clamped = CommsAudio.clamp01(volume);
    final updated = Map<String, double>.from(state.remoteVolumes)
      ..[id] = clamped;
    state = state.copyWith(remoteVolumes: updated);
    if (persist) _scheduleVolumesPersist();
    await CommsAudio.applyToRoom(
      room: state.room,
      volKey: id,
      volumes: state.remoteVolumes,
      muted: state.localMuted,
      outputEnabled: state.isAudioOutputEnabled,
    );
  }

  /// Remove the saved volume for [id] (reset to default 1.0).
  Future<void> clearRemoteVolume(String id) async {
    if (!state.remoteVolumes.containsKey(id)) return;
    final updated = Map<String, double>.from(state.remoteVolumes)..remove(id);
    state = state.copyWith(remoteVolumes: updated);
    await _persistVolumesNow();
    await CommsAudio.applyToRoom(
      room: state.room,
      volKey: id,
      volumes: state.remoteVolumes,
      muted: state.localMuted,
      outputEnabled: state.isAudioOutputEnabled,
    );
  }

  /// Remove all saved volumes.
  Future<void> clearAllRemoteVolumes() async {
    if (state.remoteVolumes.isEmpty) return;
    state = state.copyWith(remoteVolumes: {});
    await _persistVolumesNow();
    await CommsAudio.applyAll(
      room: state.room,
      volumes: state.remoteVolumes,
      muted: state.localMuted,
      outputEnabled: state.isAudioOutputEnabled,
    );
  }

  void _scheduleVolumesPersist() {
    if (_isDisposed) return;
    _volumesPersistDebounce?.cancel();
    _volumesPersistDebounce = Timer(volumesPersistDebounce, () {
      _volumesPersistDebounce = null;
      unawaited(_persistVolumesNow());
    });
  }

  Future<void> _persistVolumesNow() async {
    _volumesPersistDebounce?.cancel();
    _volumesPersistDebounce = null;
    if (_isDisposed) return;
    var entries = state.remoteVolumes.entries.toList();
    if (entries.length > maxPersistedVolumes) {
      entries = entries.sublist(entries.length - maxPersistedVolumes);
    }
    try {
      await ref
          .read(settingsControllerProvider.notifier)
          .set(volumesSettingsKey, Map<String, double>.fromEntries(entries));
    } catch (e) {
      debugPrint('[CommsController] persist volumes failed: $e');
    }
  }

  /// Toggle local-only mute for a remote participant or track.
  Future<void> toggleLocalMute(String id) async {
    final current = state.localMuted[id] ?? false;
    final updated = Map<String, bool>.from(state.localMuted)..[id] = !current;
    state = state.copyWith(localMuted: updated);
    await CommsAudio.applyToRoom(
      room: state.room,
      volKey: id,
      volumes: state.remoteVolumes,
      muted: state.localMuted,
      outputEnabled: state.isAudioOutputEnabled,
    );
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
