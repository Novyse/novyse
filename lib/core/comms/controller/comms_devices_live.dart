part of '../comms_controller.dart';

/// Live device switching + audio-output routing.
mixin CommsDevicesLiveMixin on Notifier<CommsState> {
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
        errorMessageBuilder: () => (l10n) => l10n.commsCameraAccessError,
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
}
