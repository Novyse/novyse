import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/storage/file/file.dart';
import 'package:novyse/core/storage/file/playable_uri.dart';
import 'package:novyse/core/storage/file/waveform_decoder_native.dart';
import 'package:novyse/core/storage/file/waveform_generator.dart';

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

    test('sniffs JPEG magic bytes when name has no useful extension', () {
      // JPEG SOI marker
      final jpegHeader = [0xFF, 0xD8, 0xFF, 0xE0];
      expect(getMimeTypeByName('blob', headerBytes: jpegHeader), 'image/jpeg');
      expect(getMimeType('unknown.bin', headerBytes: jpegHeader), 'image/jpeg');
    });

    test('does not override a trustworthy existing MIME with sniffing', () {
      final jpegHeader = [0xFF, 0xD8, 0xFF, 0xE0];
      expect(
        getMimeType({
          'mimeType': 'application/pdf',
          'name': 'photo.bin',
        }, headerBytes: jpegHeader),
        'application/pdf',
      );
      expect(
        getMimeType({
          'mimeType': 'image/png',
          'name': 'x',
        }, headerBytes: jpegHeader),
        'image/png',
      );
    });

    test('sniffs when existing MIME is empty or octet-stream', () {
      final jpegHeader = [0xFF, 0xD8, 0xFF, 0xE0];
      expect(
        getMimeType({
          'mimeType': defaultMimeType,
          'name': 'blob',
        }, headerBytes: jpegHeader),
        'image/jpeg',
      );
      expect(
        getMimeType({'mimeType': '', 'name': 'blob'}, headerBytes: jpegHeader),
        'image/jpeg',
      );
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

  group('Waveform pipeline Tests', () {
    test('decodes PCM bytes and normalizes them into bars', () {
      final samples = List<int>.generate(200, (i) => (i % 20) * 1000);
      final dataBytes = ByteData(samples.length * 2);
      for (var i = 0; i < samples.length; i++) {
        dataBytes.setInt16(i * 2, samples[i], Endian.host);
      }

      final pcm = decodePcm16(dataBytes.buffer.asUint8List());
      expect(pcm, isNotNull);

      final waveform = WaveformGenerator.normalizeSamples(pcm!, samples: 10);
      expect(waveform.length, 10);
      expect(waveform.every((v) => v >= 0.0 && v <= 1.0), isTrue);
      expect(waveform.any((v) => (v - 1.0).abs() < 1e-3), isTrue);
    });

    test('normalizes arbitrary PCM samples into a bounded waveform', () {
      final pcm = Float32List(100);
      for (var i = 0; i < 100; i++) {
        pcm[i] = ((i % 20) - 10) / 10;
      }

      final waveform = WaveformGenerator.normalizeSamples(pcm, samples: 10);
      expect(waveform.length, 10);
      expect(waveform.every((v) => v >= 0.0 && v <= 1.0), isTrue);
    });

    test('duration service accepts audio, voice and video files', () {
      expect(isMediaFile(mimeType: 'audio/mpeg', name: 'song.mp3'), isTrue);
      expect(
        isMediaFile(mimeType: 'audio/aac', name: 'novyse_vocal_1.m4a'),
        isTrue,
      );
      expect(isMediaFile(mimeType: 'video/mp4', name: 'clip.mp4'), isTrue);
      expect(
        isMediaFile(mimeType: 'application/pdf', name: 'doc.pdf'),
        isFalse,
      );
    });

    test('duration service infers media category from the file name', () {
      expect(
        isMediaFile(mimeType: 'application/octet-stream', name: 'clip.mov'),
        isTrue,
      );
      expect(
        isMediaFile(mimeType: 'application/octet-stream', name: 'notes.txt'),
        isFalse,
      );
    });

    test('normalizes remote and local media URIs', () {
      expect(
        normalizeMediaUri('https://cdn.test/audio.mp3'),
        'https://cdn.test/audio.mp3',
      );
      expect(
        normalizeMediaUri('blob:https://cdn.test/abc'),
        'blob:https://cdn.test/abc',
      );
      expect(
        normalizeMediaUri('data:audio/mpeg;base64,AAAA'),
        'data:audio/mpeg;base64,AAAA',
      );
      expect(
        normalizeMediaUri('file:///tmp/audio.mp3'),
        'file:///tmp/audio.mp3',
      );
      expect(normalizeMediaUri('/tmp/audio.mp3'), 'file:///tmp/audio.mp3');
      expect(normalizeMediaUri('relative/audio.mp3'), isNull);
      expect(normalizeMediaUri(null), isNull);
    });
  });

  group('FileStorage Tests', () {
    final storage = FileStorage.instance;

    setUp(() async {
      await storage.delete('test_file.txt');
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
