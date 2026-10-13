import 'dart:io';

import 'package:novyse/core/comms/devices/os_default_audio_linux.dart';
import 'package:novyse/core/comms/devices/os_default_audio_macos.dart';
import 'package:novyse/core/comms/devices/os_default_audio_stub.dart';
import 'package:novyse/core/comms/devices/os_default_audio_windows.dart';

export 'os_default_audio_stub.dart' show OsDefaultAudioNames;

/// Queries the OS-level default audio devices on Windows, Linux, and macOS.
///
/// Dispatches to platform-specific modules:
/// - Windows: [readWindowsDefaultAudioNames]
/// - Linux: [readLinuxDefaultAudioNames]
/// - macOS: [readMacOsDefaultAudioNames]
///
/// Returns an empty [OsDefaultAudioNames] on unsupported platforms or upon failure.
Future<OsDefaultAudioNames> readOsDefaultAudioNames() async {
  try {
    if (Platform.isWindows) return await readWindowsDefaultAudioNames();
    if (Platform.isLinux) return await readLinuxDefaultAudioNames();
    if (Platform.isMacOS) return await readMacOsDefaultAudioNames();
  } catch (_) {}
  return const OsDefaultAudioNames();
}
