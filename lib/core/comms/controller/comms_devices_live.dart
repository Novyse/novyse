part of '../comms_controller.dart';

/// Live device switching + audio-output routing.
mixin CommsDevicesLiveMixin
    on Notifier<CommsState>, CommsMediaSettingsMixin {
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
            audioCaptureOptions: _audioCaptureOptions(),
          );
        }
      }
    } catch (e) {
      debugPrint('[CommsController] Failed to switch microphone: $e');
    }
  }

  /// Live-applies the persisted audio DSP switches to the active mic track
  Future<void> applyAudioSettingsLive() => _applyAudioProcessingLive();

  /// Pushes [top] bitrate/framerate caps to the live RTCRtpSender(s).
  Future<bool> _pushVideoSenderEncoding(
    LocalVideoTrack track,
    VideoEncoding top, {
    required bool simulcast,
  }) async {
    var updated = false;
    try {
      final senders = <rtc.RTCRtpSender?>{
        track.sender,
        for (final info in track.simulcastCodecs.values) info.sender,
      };
      final quality = _savedMediaString(
        CommsMediaConstraints.videoQualityKey,
        CommsMediaConstraints.defaultVideoQuality,
      );
      final layers = CommsMediaConstraints.cameraSimulcastEncodingsFor(
        top,
        qualityId: quality,
      );
      for (final sender in senders) {
        if (sender == null) continue;
        try {
          final params = sender.parameters;
          var encodings = params.encodings?.toList();
          if (encodings == null || encodings.isEmpty) {
            encodings = simulcast
                ? [
                    for (final layer in layers)
                      rtc.RTCRtpEncoding(
                        active: true,
                        maxBitrate: layer.maxBitrate,
                        maxFramerate: layer.maxFramerate,
                      ),
                  ]
                : [
                    rtc.RTCRtpEncoding(
                      active: true,
                      maxBitrate: top.maxBitrate,
                      maxFramerate: top.maxFramerate,
                    ),
                  ];
          } else if (encodings.length == 1 || !simulcast) {
            encodings[0].maxBitrate = top.maxBitrate;
            encodings[0].maxFramerate = top.maxFramerate;
          } else {
            for (var i = 0; i < encodings.length; i++) {
              final layer = layers[i < 2 ? i : 2];
              encodings[i].maxBitrate = layer.maxBitrate;
              encodings[i].maxFramerate = layer.maxFramerate;
            }
          }
          params.encodings = encodings;
          if (await sender.setParameters(params)) updated = true;
        } catch (e) {
          debugPrint('[CommsController] Failed to push sender encoding: $e');
        }
      }
      if (updated) {
        final fps = top.maxFramerate;
        track.lastPublishOptions = simulcast
            ? VideoPublishOptions(
                simulcast: true,
                videoCodec: 'vp8',
                videoEncoding: top,
                videoSimulcastLayers:
                    CommsMediaConstraints.cameraSimulcastLayersFor(
                      quality,
                      fps,
                    ),
                degradationPreference:
                    DegradationPreference.maintainFramerate,
              )
            : VideoPublishOptions(
                simulcast: false,
                videoCodec: 'vp8',
                videoEncoding: top,
                degradationPreference:
                    DegradationPreference.maintainFramerate,
              );
      }
    } catch (e) {
      debugPrint('[CommsController] Failed to push sender encoding: $e');
    }
    return updated;
  }

  /// Live-applies the persisted camera quality + fps by restarting the
  /// active camera track. No-op when not publishing video.
  Future<void> applyVideoSettingsLive() async {
    final local = state.room?.localParticipant;
    if (local == null || !state.isVideoEnabled) {
      CommsMediaConstraints.debugCommsMedia(
        'apply video settings: skipped (not publishing camera)',
      );
      return;
    }
    final options = _cameraCaptureOptions();
    final params = options.params;
    CommsMediaConstraints.debugCommsMedia(
      'apply video settings: '
      '${params.dimensions.width}x${params.dimensions.height} '
      'fps=${params.encoding?.maxFramerate} '
      'bitrate=${params.encoding?.maxBitrate}',
    );
    try {
      final cameraTrack = _activeCameraTrack(local);
      if (cameraTrack == null) {
        await local.setCameraEnabled(false);
        await local.setCameraEnabled(true, cameraCaptureOptions: options);
        final fresh = _activeCameraTrack(local);
        if (fresh != null && params.encoding != null) {
          await _pushVideoSenderEncoding(
            fresh,
            params.encoding!,
            simulcast: true,
          );
        }
        return;
      }
      await cameraTrack.restartTrack(options);
      await cameraTrack.replaceTrackForMultiCodecSimulcast(
        cameraTrack.mediaStreamTrack,
      );
      if (params.encoding != null) {
        await _pushVideoSenderEncoding(
          cameraTrack,
          params.encoding!,
          simulcast: true,
        );
      }
      CommsMediaConstraints.debugCommsMedia(
        'apply video settings: camera track restarted',
      );
    } catch (e) {
      debugPrint('[CommsController] Failed to apply video settings: $e');
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
        // No camera track yet: republish path keeps the saved quality/fps.
        await local.setCameraEnabled(false);
        await local.setCameraEnabled(
          true,
          cameraCaptureOptions: _cameraCaptureOptions().copyWith(
            deviceId: target,
          ),
        );
        final fresh = _activeCameraTrack(local);
        final encoding = _cameraCaptureOptions().params.encoding;
        if (fresh != null && encoding != null) {
          await _pushVideoSenderEncoding(fresh, encoding, simulcast: true);
        }
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
      final options = _cameraCaptureOptions();
      final params = options.params;
      CommsMediaConstraints.debugCommsMedia(
        'restart camera track: deviceId=<default> '
        '${params.dimensions.width}x${params.dimensions.height} '
        'fps=${params.encoding?.maxFramerate} '
        'bitrate=${params.encoding?.maxBitrate}',
      );
      await track.restartTrack(options);
      await track.replaceTrackForMultiCodecSimulcast(track.mediaStreamTrack);
      final encoding = params.encoding;
      if (encoding != null) {
        await _pushVideoSenderEncoding(track, encoding, simulcast: true);
      }
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
