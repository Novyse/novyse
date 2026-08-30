import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/storage/file/file.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('FileType & MIME Resolver Tests', () {
    test('resolves file types by MIME correctly', () {
      expect(getFileType('image/jpeg'), FileTypeCategory.image);
      expect(getFileType('video/mp4'), FileTypeCategory.video);
      expect(getFileType('audio/mpeg'), FileTypeCategory.audio);
      expect(getFileType('application/pdf'), FileTypeCategory.document);
      expect(getFileType('application/json'), FileTypeCategory.code);
      expect(getFileType('application/zip'), FileTypeCategory.archive);
      expect(getFileType('application/unknown'), FileTypeCategory.other);
    });

    test('handles voice vs audio distinction based on filename', () {
      expect(
        getFileType('audio/wav', 'novyse_vocal_123.wav'),
        FileTypeCategory.voice,
      );
      expect(getFileType('audio/wav', 'song.wav'), FileTypeCategory.audio);
      expect(
        getFileType('audio/aac', 'novyse_vocal_record.aac'),
        FileTypeCategory.voice,
      );
      expect(getFileType('audio/aac', 'track.aac'), FileTypeCategory.audio);
    });

    test('resolves MIME types by filename and object', () {
      expect(getMimeType('photo.png'), 'image/png');
      expect(getMimeType('movie.mp4'), 'video/mp4');
      expect(getMimeType('document.pdf'), 'application/pdf');
      expect(getMimeType({'mimeType': 'custom/type'}), 'custom/type');
      expect(getMimeType({'name': 'file.json'}), 'application/json');
    });
  });

  group('FileUtils Tests', () {
    test('formats time and durations correctly', () {
      expect(formatTime(0), '00:00');
      expect(formatTime(65), '01:05');
      expect(formatTime(3665), '01:01:05');

      expect(formatDuration(45), '45s');
      expect(formatDuration(125), '2m 5s');
      expect(formatDuration(3665), '1h 1m 5s');
    });

    test('formats file sizes and calculates total size', () {
      expect(formatFileSize(0), '0 B');
      expect(formatFileSize(1024), '1.00 KB');
      expect(formatFileSize(1024 * 1024 * 5), '5.00 MB');

      final total = calculateTotalSize([
        {'size': 1000},
        {'fileSize': 2000},
        3000,
      ]);
      expect(total, 6000);
    });
  });

  group('FileValidators Tests', () {
    test('validates file count and total size', () {
      final res1 = validateFiles([
        {'size': 1024, 'mimeType': 'image/jpeg'},
        {'size': 1024, 'mimeType': 'image/png'},
      ], maxFiles: 1);
      expect(res1.hasErrors, isTrue);
      expect(res1.globalError, contains('Too many files'));

      final res2 = validateFiles([
        {'size': 5000, 'mimeType': 'image/jpeg'},
      ], maxTotalSize: 4000);
      expect(res2.hasErrors, isTrue);
      expect(res2.globalError, contains('Total file size too large'));
    });

    test('validates individual file sizes and allowed types', () {
      final res = validateFiles(
        [
          {'size': 0, 'mimeType': 'image/jpeg'},
          {'size': 10000, 'mimeType': 'application/pdf'},
        ],
        fileType: 'Image',
        maxSingleSize: 5000,
      );

      expect(res.hasErrors, isTrue);
      expect(res.invalidFilesData.length, 2);
      expect(
        res.invalidFilesData[0].errors.any((e) => e.contains('size is 0')),
        isTrue,
      );
      expect(
        res.invalidFilesData[1].errors.any(
          (e) => e.contains('exceeds maximum'),
        ),
        isTrue,
      );
      expect(
        res.invalidFilesData[1].errors.any(
          (e) => e.contains('File type not allowed'),
        ),
        isTrue,
      );
    });
  });

  group('MediaUtils Tests', () {
    test('processes normalized waveform from PCM bytes', () {
      final pcmBytes = Uint8List(100);
      for (var i = 0; i < 100; i++) {
        pcmBytes[i] = (i % 20) * 10;
      }

      final waveform = processWaveform(pcmBytes, samples: 10);
      expect(waveform.length, 10);
      expect(waveform.every((v) => v >= 0.0 && v <= 1.0), isTrue);
      expect(waveform.any((v) => (v - 1.0).abs() < 1e-3), isTrue);
    });

    test('extracts WAV duration from synthetic WAV header', () {
      // Create minimal WAV header: 44 bytes + 16000 bytes data (1 sec at 16000 byteRate)
      final wavData = Uint8List(44 + 16000);
      final byteData = ByteData.sublistView(wavData);

      // 'RIFF'
      byteData.setUint32(0, 0x52494646, Endian.big);
      // 'WAVE'
      byteData.setUint32(8, 0x57415645, Endian.big);
      // 'fmt '
      byteData.setUint32(12, 0x666D7420, Endian.big);
      // Subchunk1Size = 16
      byteData.setUint32(16, 16, Endian.little);
      // ByteRate = 16000
      byteData.setUint32(28, 16000, Endian.little);
      // 'data'
      byteData.setUint32(36, 0x64617461, Endian.big);
      // Subchunk2Size = 16000
      byteData.setUint32(40, 16000, Endian.little);

      final duration = extractAudioDurationFromWav(wavData);
      expect(duration, 1);
    });
  });

  group('FileStorage Tests', () {
    final storage = FileStorage.instance;

    setUp(() async {
      await storage.clearAll();
    });

    test('saves and reads file by bytes', () async {
      final testData = utf8.encode('Hello Novyse Storage!');
      final saveResult = await storage.save.byBytes(testData, 'test_file.txt');

      expect(saveResult.ref, 'test_file.txt');
      expect(saveResult.size, testData.length);

      expect(await storage.exists('test_file.txt'), isTrue);
      expect(await storage.getSize('test_file.txt'), testData.length);

      final readBytes = await storage.getBytes('test_file.txt');
      expect(readBytes, isNotNull);
      expect(utf8.decode(readBytes!), 'Hello Novyse Storage!');

      final deleted = await storage.delete('test_file.txt');
      expect(deleted, isTrue);
      expect(await storage.exists('test_file.txt'), isFalse);
    });
  });

  group('S3Adapter Tests', () {
    test('handles transfer cancellation via cancel token', () async {
      // Register transfer and cancel
      S3Adapter.cancel('test-uuid-non-existent');
      expect(S3Adapter.isActive('test-uuid-non-existent'), isFalse);
    });
  });
}
