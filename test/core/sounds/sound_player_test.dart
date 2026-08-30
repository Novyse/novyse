import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/sounds/sounds.dart';
import 'package:novyse/core/sounds/sound_player.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Sounds & Path Resolution Tests', () {
    test('resolves dot notation keys correctly', () {
      expect(resolveSoundPath('comms.join'), 'assets/audio/comms/join.wav');
      expect(resolveSoundPath('comms.leave'), 'assets/audio/comms/leave.wav');
      expect(
        resolveSoundPath('comms.screen_share.start'),
        'assets/audio/comms/screen_share/start.wav',
      );
      expect(
        resolveSoundPath('comms.screen_share.stop'),
        'assets/audio/comms/screen_share/stop.wav',
      );
    });

    test('returns null for non-existent sound keys', () {
      expect(resolveSoundPath('unknown.sound'), isNull);
      expect(resolveSoundPath('comms.unknown'), isNull);
    });

    test('AppSound enum paths are correctly structured', () {
      expect(AppSound.commsJoin.assetPath, 'assets/audio/comms/join.wav');
      expect(AppSound.commsJoin.audioPlayerSourcePath, 'audio/comms/join.wav');
      expect(AppSound.commsLeave.assetPath, 'assets/audio/comms/leave.wav');
      expect(
        AppSound.commsScreenShareStart.audioPlayerSourcePath,
        'audio/comms/screen_share/start.wav',
      );
    });
  });

  group('SoundPlayer Tests', () {
    final player = SoundPlayer.instance;

    test('muting toggle prevents sound execution', () async {
      player.setMuted(true);
      expect(player.isMuted, isTrue);

      // Should return immediately without throwing
      await player.playSound('comms.join');

      player.setMuted(false);
      expect(player.isMuted, isFalse);
    });

    test('handles unknown sound gracefully without throwing', () async {
      await player.playSound('unknown.sound.key');
    });
  });
}
