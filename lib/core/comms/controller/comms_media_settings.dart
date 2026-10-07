part of '../comms_controller.dart';

mixin CommsMediaSettingsMixin on Notifier<CommsState> {
  /// Reads the persisted device id for [key] (`'default'` = system default).
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

  /// Reads a persisted string setting with [fallback] when missing/empty.
  String _savedMediaString(String key, String fallback) {
    try {
      final raw = ref.read(settingsControllerProvider)[key];
      if (raw is String && raw.isNotEmpty) return raw;
    } catch (_) {}
    return fallback;
  }

  /// Reads a persisted bool setting with [fallback] when missing.
  bool _savedMediaBool(String key, bool fallback) {
    try {
      final raw = ref.read(settingsControllerProvider)[key];
      if (raw is bool) return raw;
    } catch (_) {}
    return fallback;
  }

  /// Audio capture options resolved from the settings JSON
  /// (noise suppression + echo cancellation switches).
  AudioCaptureOptions _audioCaptureOptions() {
    return CommsMediaConstraints.audioCapture(
      deviceId: CommsDevicesDefaults.resolveLiveKitDeviceId(
        _savedDeviceId(CommsDevicesDefaults.kAudioInputKey),
      ),
      noiseSuppression: _savedMediaBool(
        CommsMediaConstraints.noiseSuppressionKey,
        CommsMediaConstraints.defaultNoiseSuppression,
      ),
      echoCancellation: _savedMediaBool(
        CommsMediaConstraints.echoCancellationKey,
        CommsMediaConstraints.defaultEchoCancellation,
      ),
    );
  }

  /// Camera capture options resolved from the settings JSON
  CameraCaptureOptions _cameraCaptureOptions() {
    return CommsMediaConstraints.cameraCapture(
      deviceId: CommsDevicesDefaults.resolveLiveKitDeviceId(
        _savedDeviceId(CommsDevicesDefaults.kVideoInputKey),
      ),
      qualityId: _savedMediaString(
        CommsMediaConstraints.videoQualityKey,
        CommsMediaConstraints.defaultVideoQuality,
      ),
      fpsId: _savedMediaString(
        CommsMediaConstraints.videoFramerateKey,
        CommsMediaConstraints.defaultVideoFramerate,
      ),
    );
  }

  /// Live-applies the audio DSP switches to the active mic track without
  /// restarting capture. Called when the settings change mid-call.
  Future<void> _applyAudioProcessingLive() async {
    final local = state.room?.localParticipant;
    if (local == null) return;
    // ignore: experimental_member_use
    final processing = CommsMediaConstraints.audioProcessing(
      noiseSuppression: _savedMediaBool(
        CommsMediaConstraints.noiseSuppressionKey,
        CommsMediaConstraints.defaultNoiseSuppression,
      ),
      echoCancellation: _savedMediaBool(
        CommsMediaConstraints.echoCancellationKey,
        CommsMediaConstraints.defaultEchoCancellation,
      ),
    );
    for (final pub in local.audioTrackPublications.toList()) {
      final track = pub.track;
      if (track is LocalAudioTrack && track.source == TrackSource.microphone) {
        try {
          // ignore: experimental_member_use
          await track.setAudioProcessingOptions(processing);
        } catch (e) {
          debugPrint('[CommsController] Failed to apply DSP live: $e');
        }
      }
    }
  }
}
