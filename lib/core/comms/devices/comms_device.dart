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

/// Concrete device behind the `Default` option, if known.
@immutable
class SystemDefaultDevice {
  final String? id;
  final String? label;

  const SystemDefaultDevice({this.id, this.label});
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

  static const _pseudoIds = {'default', 'communications'};

  /// Folds the system default into a single `Default — name` option.
  ///
  /// Browsers expose a pseudo-device with id `default` sharing the real
  /// device's [CommsDevice.groupId]. On Windows [osDefaultId]/[osDefaultLabel]
  /// identify the OS default endpoint; a virtual role entry
  /// (`Default - Name`, any system language) is mapped to the physical
  /// device that follows it, since the role entry itself does not capture.
  static ({List<CommsDevice> devices, SystemDefaultDevice systemDefault})
  collapseSystemDefault(
    List<CommsDevice> devices, {
    String? osDefaultId,
    String? osDefaultLabel,
  }) {
    final concrete = devices.where((d) => !_isPseudoId(d.id)).toList();
    final aliasGroup = devices
        .where((d) => d.id.trim().toLowerCase() == kDefaultId)
        .firstOrNull
        ?.groupId;

    final match = _matchDefault(
      concrete,
      groupId: aliasGroup,
      osDefaultId: osDefaultId,
      osDefaultLabel: osDefaultLabel,
    );
    final label = match?.label.trim();
    return (
      devices: [
        for (final device in concrete)
          if (device.id != match?.id &&
              _physicalDevice(device, concrete).id != match?.id)
            device,
      ],
      systemDefault: SystemDefaultDevice(
        id: match?.id,
        label: label != null && label.isNotEmpty ? label : _trimmedOrNull(osDefaultLabel),
      ),
    );
  }

  static bool _isPseudoId(String id) =>
      _pseudoIds.contains(id.trim().toLowerCase());

  static CommsDevice? _matchDefault(
    List<CommsDevice> devices, {
    String? groupId,
    String? osDefaultId,
    String? osDefaultLabel,
  }) {
    final group = groupId?.trim();
    if (group != null && group.isNotEmpty) {
      for (final device in devices) {
        if (device.groupId?.trim() == group) {
          return _physicalDevice(device, devices);
        }
      }
    }
    final name = osDefaultLabel?.trim().toLowerCase();
    if (name != null && name.isNotEmpty) {
      for (final device in devices) {
        if (device.label.trim().toLowerCase() == name) {
          return _physicalDevice(device, devices);
        }
      }
    }
    final endpoint = osDefaultId?.trim().toLowerCase();
    if (endpoint != null && endpoint.isNotEmpty) {
      CommsDevice? endpointMatch;
      for (final device in devices) {
        if (_sameEndpoint(device.id, endpoint)) endpointMatch = device;
      }
      if (endpointMatch != null) {
        return _physicalDevice(endpointMatch, devices);
      }
    }
    for (final device in devices) {
      final physical = _physicalDevice(device, devices);
      if (physical.id != device.id) return physical;
    }
    return null;
  }

  /// Maps a virtual role entry to its physical device, else returns [candidate].
  static CommsDevice _physicalDevice(
    CommsDevice candidate,
    List<CommsDevice> devices,
  ) {
    final wanted = _nameAfterSeparator(candidate.label);
    if (wanted == null) return candidate;
    for (final device in devices) {
      if (device.id == candidate.id) continue;
      if (_nameAfterSeparator(device.label) != null) continue;
      final label = device.label.trim().toLowerCase();
      if (label == wanted ||
          label.startsWith('$wanted ') ||
          label.startsWith('$wanted(')) {
        return device;
      }
    }
    return candidate;
  }

  /// Text after the first ` - ` style separator, in any language.
  static String? _nameAfterSeparator(String label) {
    final trimmed = label.trim();
    final separator = RegExp(r'\s[-–—:]\s').firstMatch(trimmed);
    if (separator == null || separator.start > 40) return null;
    final name = trimmed.substring(separator.end).trim().toLowerCase();
    return name.isEmpty ? null : name;
  }

  /// Compares the device GUID. Windows endpoint ids also carry a role prefix
  /// (`{0.0.1.00000000}`) that is not a device and must not match on its own.
  static bool _sameEndpoint(String deviceId, String endpointId) {
    final left = deviceId.trim().toLowerCase();
    final guid = _endpointGuid(endpointId);
    if (left.isEmpty || guid == null) return false;
    return left == guid || left.contains(guid);
  }

  static final RegExp _endpointGuidPattern = RegExp(
    r'\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}',
    caseSensitive: false,
  );

  static String? _endpointGuid(String endpointId) {
    final matches = _endpointGuidPattern.allMatches(endpointId);
    if (matches.isEmpty) return null;
    return matches.last.group(0)!.toLowerCase();
  }

  static String? _trimmedOrNull(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }

  /// `Default`, or `Default — Headset` when the OS default device is known.
  static String defaultOptionLabel(String? systemDefaultLabel) {
    final name = systemDefaultLabel?.trim();
    if (name == null || name.isEmpty) return 'Default';
    return 'Default — $name';
  }
}
