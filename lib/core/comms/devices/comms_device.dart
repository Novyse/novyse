import 'package:flutter/foundation.dart';

/// Kind of capture/playout device.
enum CommsDeviceKind { audioInput, audioOutput, videoInput }

/// Single OS-enumerated device, normalized for UI + persistence.
///
/// `id` is the OS `deviceId`. The pseudo-id `'default'` always means
/// "system default" (no constraint passed to LiveKit).
@immutable
class CommsDevice {
  final String id;
  final String label;
  final CommsDeviceKind kind;
  final String? groupId;

  const CommsDevice({
    required this.id,
    required this.label,
    required this.kind,
    this.groupId,
  });

  bool get isSystemDefault => id == CommsDevicesDefaults.kDefaultId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CommsDevice &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          kind == other.kind;

  @override
  int get hashCode => Object.hash(id, kind);
}

/// Shared setting keys + default id for comms devices.
abstract final class CommsDevicesDefaults {
  static const kDefaultId = 'default';
  static const kAudioInputKey = 'comms.inputDevice';
  static const kAudioOutputKey = 'comms.outputDevice';
  static const kVideoInputKey = 'comms.webcam';

  /// `null` means "system default" for LiveKit capture options.
  static String? resolveLiveKitDeviceId(String? savedId) {
    if (savedId == null || savedId.isEmpty || savedId == kDefaultId) {
      return null;
    }
    return savedId;
  }
}
