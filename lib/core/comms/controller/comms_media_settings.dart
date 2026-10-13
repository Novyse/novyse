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

  /// Reads a persisted int setting or returns null when missing/invalid.
  int? _savedMediaIntOrNull(String key) {
    try {
      final raw = ref.read(settingsControllerProvider)[key];
      if (raw is int) return raw;
      if (raw is num) return raw.toInt();
      if (raw is String) return int.tryParse(raw);
    } catch (_) {}
    return null;
  }

  /// Capture device id. On desktop `default` resolves to the concrete OS
  /// default device — an empty id opens a silent virtual entry instead.
  String? _microphoneDeviceId() {
    final saved = _savedDeviceId(CommsDevicesDefaults.kAudioInputKey);
    if (saved != CommsDevicesDefaults.kDefaultId) return saved;
    if (currentPlatform != AppPlatform.desktop) return null;
    try {
      return ref.read(commsDevicesProvider).systemDefaultAudioInput.id;
    } catch (_) {
      return null;
    }
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
      maxBitrateKbps: _savedMediaIntOrNull(
        CommsMediaConstraints.videoBitrateKey,
      ),
    );
  }
}
