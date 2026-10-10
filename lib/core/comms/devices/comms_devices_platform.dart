import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/devices/comms_device.dart';
import 'package:novyse/core/utils/platform.dart';

/// Platform branching for device routing (single place).
///
/// - Desktop (Linux/Windows/macOS): full `Hardware.selectAudioOutput`.
/// - Mobile (Android/iOS): `selectAudioOutput` unsupported on iOS, input
///   selection only via capture `deviceId`.
/// - Web: output via `RemoteAudioTrack.setSinkId`, input via `deviceId`.
abstract final class CommsDevicesPlatform {
  /// Route playout to [savedId] (`'default'` = system default).
  static Future<void> applyAudioOutput({
    required Room? room,
    required String savedId,
  }) async {
    final deviceId = CommsDevicesDefaults.resolveLiveKitDeviceId(savedId);
    if (room == null) return;

    if (currentOS == AppOS.web) {
      if (deviceId == null) return;
      for (final participant in room.remoteParticipants.values) {
        for (final pub in participant.audioTrackPublications) {
          final track = pub.track;
          if (track is RemoteAudioTrack) {
            try {
              track.setSinkId(deviceId);
            } catch (_) {}
          }
        }
      }
      return;
    }

    if (currentOS == AppOS.ios) {
      // iOS: no enumerator output routing; keep system routing.
      return;
    }

    // Desktop + Android: native output selection.
    if (deviceId == null) return;
    try {
      final outputs = await Hardware.instance.audioOutputs();
      final match = outputs.where((d) => d.deviceId == deviceId).firstOrNull;
      if (match != null) {
        await Hardware.instance.selectAudioOutput(match);
      }
    } catch (_) {}
  }

  /// Apply output routing to a freshly subscribed remote track.
  static void applyAudioOutputToTrack({
    required Track track,
    required String savedOutputId,
  }) {
    if (currentOS != AppOS.web) return;
    final deviceId = CommsDevicesDefaults.resolveLiveKitDeviceId(
      savedOutputId,
    );
    if (deviceId == null) return;
    if (track is RemoteAudioTrack) {
      try {
        track.setSinkId(deviceId);
      } catch (_) {}
    }
  }
}
