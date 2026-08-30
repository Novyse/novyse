/// Enum for strongly-typed sound assets in the application.
enum AppSound {
  commsJoin('assets/audio/comms/join.wav', 'comms.join'),
  commsLeave('assets/audio/comms/leave.wav', 'comms.leave'),
  commsScreenShareStart('assets/audio/comms/screen_share/start.wav', 'comms.screen_share.start'),
  commsScreenShareStop('assets/audio/comms/screen_share/stop.wav', 'comms.screen_share.stop');

  final String assetPath;
  final String key;
  const AppSound(this.assetPath, this.key);

  /// Strips the leading `assets/` for audioplayers `AssetSource`.
  String get audioPlayerSourcePath {
    if (assetPath.startsWith('assets/')) {
      return assetPath.substring('assets/'.length);
    }
    return assetPath;
  }
}

/// Map containing all sound assets structured by category / dot-separated keys.
const Map<String, dynamic> soundsMap = {
  'comms': {
    'join': 'assets/audio/comms/join.wav',
    'leave': 'assets/audio/comms/leave.wav',
    'screen_share': {
      'start': 'assets/audio/comms/screen_share/start.wav',
      'stop': 'assets/audio/comms/screen_share/stop.wav',
    },
  },
};

/// Resolves a sound asset path from a dot-separated string key (e.g. `'comms.join'`)
/// or returns null if not found.
String? resolveSoundPath(String soundName) {
  final keys = soundName.trim().split('.');
  dynamic current = soundsMap;

  for (final k in keys) {
    if (current is Map && current.containsKey(k)) {
      current = current[k];
    } else {
      current = null;
      break;
    }
  }

  if (current is String) {
    return current;
  }

  // Fallback: check matching enum key or name
  for (final sound in AppSound.values) {
    if (sound.key == soundName || sound.name == soundName) {
      return sound.assetPath;
    }
  }

  return null;
}
