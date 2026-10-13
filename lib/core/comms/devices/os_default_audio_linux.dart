import 'dart:io';

import 'package:novyse/core/comms/devices/os_default_audio_stub.dart';

/// Reads the default capture and render endpoints on Linux via PulseAudio / PipeWire (`pactl`).
Future<OsDefaultAudioNames> readLinuxDefaultAudioNames() async {
  return _LinuxDefaultAudio().read();
}

class _LinuxDefaultAudio {
  Future<OsDefaultAudioNames> read() async {
    final results = await Future.wait([
      _defaultDevice('sink'),
      _defaultDevice('source'),
    ]);
    return OsDefaultAudioNames(
      outputId: results[0]?.id,
      output: results[0]?.label,
      inputId: results[1]?.id,
      input: results[1]?.label,
    );
  }

  /// Returns the default sink or source name + description.
  Future<({String? id, String? label})?> _defaultDevice(
    String type,
  ) async {
    try {
      // `pactl get-default-sink` / `pactl get-default-source`
      final nameResult = await Process.run('pactl', ['get-default-$type']);
      if (nameResult.exitCode != 0) return null;
      final name = (nameResult.stdout as String).trim();
      if (name.isEmpty) return null;

      // Retrieve the friendly description for this device.
      final label = await _deviceDescription(type, name);
      return (id: name, label: label);
    } catch (_) {
      return null;
    }
  }

  /// Parses `pactl list sinks/sources` output for the matching device's
  /// `Description:` field.
  Future<String?> _deviceDescription(String type, String name) async {
    try {
      // `pactl list sinks` / `pactl list sources`
      final plural = type == 'sink' ? 'sinks' : 'sources';
      final listResult = await Process.run('pactl', ['list', plural]);
      if (listResult.exitCode != 0) return null;

      final lines = (listResult.stdout as String).split('\n');
      bool found = false;
      for (final line in lines) {
        final trimmed = line.trim();
        if (trimmed.startsWith('Name:')) {
          found = trimmed.substring('Name:'.length).trim() == name;
        } else if (found && trimmed.startsWith('Description:')) {
          final desc = trimmed.substring('Description:'.length).trim();
          return desc.isNotEmpty ? desc : null;
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
