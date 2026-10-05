import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_audio.dart';

void main() {
  group('volKeyForTile', () {
    test('uses identity for camera/mic tiles', () {
      expect(
        CommsAudio.volKeyForTile(
          id: 'user1_session',
          isScreenShare: false,
          trackSid: null,
        ),
        'user1_session',
      );
    });

    test('uses track SID for screen-share tiles', () {
      expect(
        CommsAudio.volKeyForTile(
          id: 'TR_123',
          isScreenShare: true,
          trackSid: 'TR_123',
        ),
        'TR_123',
      );
    });
  });

  group('clamp01', () {
    test('passes through in-range values', () {
      expect(CommsAudio.clamp01(0.4), 0.4);
    });

    test('clamps above 1.0 and below 0.0', () {
      expect(CommsAudio.clamp01(1.5), 1.0);
      expect(CommsAudio.clamp01(-0.2), 0.0);
    });
  });

  group('effectiveVolume', () {
    test('returns the stored linear volume', () {
      expect(
        CommsAudio.effectiveVolume(
          volume: 0.6,
          locallyMuted: false,
          outputEnabled: true,
        ),
        0.6,
      );
    });

    test('silences on local mute', () {
      expect(
        CommsAudio.effectiveVolume(
          volume: 0.6,
          locallyMuted: true,
          outputEnabled: true,
        ),
        0.0,
      );
    });

    test('silences on global deafen', () {
      expect(
        CommsAudio.effectiveVolume(
          volume: 0.6,
          locallyMuted: false,
          outputEnabled: false,
        ),
        0.0,
      );
    });
  });
}
