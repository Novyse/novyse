import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/sounds/sounds.dart';

/// Service for playing short audio UI effects and system sounds.
class SoundPlayer {
  SoundPlayer._();
  static final SoundPlayer instance = SoundPlayer._();

  bool _isMuted = false;
  bool get isMuted => _isMuted;

  void setMuted(bool muted) {
    _isMuted = muted;
  }

  /// Plays a sound effect.
  /// [sound] can be an [AppSound] enum, a dot-notation key (e.g. `'comms.join'`),
  /// or a raw asset path (e.g. `'assets/audio/comms/join.wav'`).
  Future<void> playSound(dynamic sound, {double volume = 1.0}) async {
    if (_isMuted) return;

    String? path;
    if (sound is AppSound) {
      path = sound.assetPath;
    } else if (sound is String) {
      path = resolveSoundPath(sound);
      if (path == null &&
          (sound.startsWith('assets/') ||
              sound.endsWith('.wav') ||
              sound.endsWith('.mp3') ||
              sound.endsWith('.ogg'))) {
        path = sound;
      }
    }

    if (path == null || path.isEmpty) {
      debugPrint('[SoundPlayer] Sound "$sound" not found');
      return;
    }

    try {
      // audioplayers expects paths relative to the assets root
      final sourcePath = path.startsWith('assets/')
          ? path.substring('assets/'.length)
          : path;

      final player = AudioPlayer();
      await player.setPlayerMode(PlayerMode.lowLatency);
      await player.setVolume(volume.clamp(0.0, 1.0));

      player.onPlayerComplete.listen((_) {
        player.dispose();
      });

      await player.play(AssetSource(sourcePath));
      debugPrint('[SoundPlayer] Played sound: $sound ($path)');
    } catch (e) {
      debugPrint('[SoundPlayer] Error playing sound "$sound": $e');
    }
  }
}

/// Riverpod provider for [SoundPlayer].
final soundPlayerProvider = Provider<SoundPlayer>((ref) {
  return SoundPlayer.instance;
});
