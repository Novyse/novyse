import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/services/media_metadata_service.dart';

void main() {
  group('MediaMetadataService', () {
    test('generateVoiceWaveform ignores audio and video files', () async {
      final bytes = Uint8List.fromList([1, 2, 3, 4]);

      expect(
        await generateVoiceWaveform(
          fileUUID: 'audio-1',
          bytes: bytes,
          name: 'song.mp3',
          mimeType: 'audio/mpeg',
        ),
        isNull,
      );
      expect(
        await generateVoiceWaveform(
          fileUUID: 'video-1',
          bytes: bytes,
          name: 'clip.mp4',
          mimeType: 'video/mp4',
        ),
        isNull,
      );
    });
  });
}
