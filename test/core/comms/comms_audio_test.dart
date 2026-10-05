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

  group('clampVolume', () {
    test('passes through in-range values, including boost', () {
      expect(CommsAudio.clampVolume(0.4), 0.4);
      expect(CommsAudio.clampVolume(1.5), 1.5);
    });

    test('clamps above the max and below 0.0', () {
      expect(CommsAudio.clampVolume(2.5), CommsAudio.maxVolume);
      expect(CommsAudio.clampVolume(-0.2), 0.0);
    });

    test('caps web at unity', () {
      // platformCappedVolume is OS-dependent; document the contract here.
      expect(CommsAudio.maxVolume, 2.0);
      expect(CommsAudio.unityVolume, 1.0);
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

  group('parsePersistedVolumes', () {
    test('parses a decoded map', () {
      expect(
        CommsAudio.parsePersistedVolumes({'u1_s1': 0.5, 'u2_s9': 1.0}),
        {'u1_s1': 0.5, 'u2_s9': 1.0},
      );
    });

    test('parses a raw JSON string', () {
      expect(
        CommsAudio.parsePersistedVolumes('{"u1_s1":0.25}'),
        {'u1_s1': 0.25},
      );
    });

    test('drops malformed entries and clamps the rest', () {
      expect(
        CommsAudio.parsePersistedVolumes({
          'u1_s1': 1.5,
          'bad': 'nope',
          '': 0.5,
          'u2_s9': -3,
          'u3_s9': 5.0,
        }),
        {'u1_s1': 1.5, 'u2_s9': 0.0, 'u3_s9': 2.0},
      );
    });

    test('returns empty for null, empty and garbage', () {
      expect(CommsAudio.parsePersistedVolumes(null), isEmpty);
      expect(CommsAudio.parsePersistedVolumes({}), isEmpty);
      expect(CommsAudio.parsePersistedVolumes('not json'), isEmpty);
      expect(CommsAudio.parsePersistedVolumes(42), isEmpty);
    });
  });
}
