part of '../comms_controller.dart';

/// Local mic / camera toggles.
mixin CommsLocalMediaMixin
    on Notifier<CommsState>, CommsDevicesLiveMixin, CommsMediaSettingsMixin {
  /// Toggles local microphone.
  Future<void> toggleAudio() async {
    final localParticipant = state.room?.localParticipant;
    if (localParticipant == null) return;

    try {
      final next = !state.isAudioEnabled;
      await localParticipant.setMicrophoneEnabled(
        next,
        audioCaptureOptions: _audioCaptureOptions(),
      );
      state = state.copyWith(isAudioEnabled: next);
    } catch (e) {
      debugPrint('[CommsController] Failed to toggle microphone: $e');
      state = state.copyWith(
        errorMessageBuilder: () => (l10n) => l10n.commsMicAccessError,
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
        cameraCaptureOptions: _cameraCaptureOptions(),
      );
      if (next) {
        final track = _activeCameraTrack(localParticipant);
        final encoding = _cameraCaptureOptions().params.encoding;
        if (track != null && encoding != null) {
          await _pushVideoSenderEncoding(track, encoding, simulcast: true);
        }
      }
      state = state.copyWith(isVideoEnabled: next);
    } catch (e) {
      debugPrint('[CommsController] Failed to toggle camera: $e');
      state = state.copyWith(
        errorMessageBuilder: () => (l10n) => l10n.commsCameraAccessError,
      );
    }
  }
}
