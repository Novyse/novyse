import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart' as rtc;
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_audio.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/comms/comms_share_config.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/comms/devices/comms_device.dart';
import 'package:novyse/core/comms/devices/comms_devices_controller.dart';
import 'package:novyse/core/comms/devices/comms_devices_platform.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/sounds/sound_player.dart';
import 'package:novyse/core/utils/platform.dart';

part 'controller/comms_connection.dart';
part 'controller/comms_local_media.dart';
part 'controller/comms_media_settings.dart';
part 'controller/comms_devices_live.dart';
part 'controller/comms_screenshare.dart';
part 'controller/comms_view_state.dart';
part 'controller/comms_volumes.dart';

/// Riverpod Notifier managing the LiveKit Room connection and audio/video controls.
class CommsNotifier extends Notifier<CommsState>
    with
        CommsMediaSettingsMixin,
        CommsDevicesLiveMixin,
        CommsScreenshareMixin,
        CommsViewStateMixin,
        CommsVolumesMixin,
        CommsLocalMediaMixin,
        CommsConnectionMixin {
  @override
  bool _isDisposed = false;

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
    ref.listen<Map<String, Object?>>(settingsControllerProvider, (prev, next) {
      _hydrateVolumes(next);
      _onAudioDspSettingsChanged(prev, next);
    });
    Future.microtask(() {
      if (_isDisposed) return;
      try {
        _hydrateVolumes(ref.read(settingsControllerProvider));
      } catch (_) {}
    });
    return const CommsState();
  }

  /// Reacts to noise-suppression / echo-cancellation flips mid-call by
  /// pushing the new processing config to the live mic track.
  void _onAudioDspSettingsChanged(
    Map<String, Object?>? prev,
    Map<String, Object?> next,
  ) {
    if (prev == null) return;
    final noiseChanged =
        prev[CommsMediaConstraints.noiseSuppressionKey] !=
        next[CommsMediaConstraints.noiseSuppressionKey];
    final echoChanged =
        prev[CommsMediaConstraints.echoCancellationKey] !=
        next[CommsMediaConstraints.echoCancellationKey];
    if (!noiseChanged && !echoChanged) return;
    if (state.room?.localParticipant == null) return;
    unawaited(_applyAudioProcessingLive());
  }
}

/// Global provider for vocal communications.
final commsProvider = NotifierProvider<CommsNotifier, CommsState>(
  CommsNotifier.new,
);
