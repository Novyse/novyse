import 'dart:math' as math;
import 'dart:typed_data';

import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/storage/file/file_storage.dart';

final List<double> defaultWaveform = List.filled(50, 0.0);

/// Generates normalized waveform data (default 50 samples between 0.0 and 1.0)
/// from raw audio bytes or PCM data.
List<double> processWaveform(Uint8List bytes, {int samples = 50}) {
  if (bytes.isEmpty || samples <= 0) return defaultWaveform;

  // If WAV header is present (RIFF...WAVE), skip header up to data chunk
  var offset = 0;
  if (bytes.length >= 44 &&
      bytes[0] == 0x52 && // 'R'
      bytes[1] == 0x49 && // 'I'
      bytes[2] == 0x46 && // 'F'
      bytes[3] == 0x46) {
    // 'F'
    for (var i = 12; i < bytes.length - 8; i++) {
      if (bytes[i] == 0x64 && // 'd'
          bytes[i + 1] == 0x61 && // 'a'
          bytes[i + 2] == 0x74 && // 't'
          bytes[i + 3] == 0x61) {
        // 'a'
        offset = i + 8;
        break;
      }
    }
  }

  final audioBytes = bytes.sublist(offset);
  final totalBytes = audioBytes.length;
  if (totalBytes == 0) return defaultWaveform;

  // Treat as 16-bit signed PCM samples if size is even, else 8-bit
  final is16Bit = totalBytes % 2 == 0;
  final sampleCount = is16Bit ? totalBytes ~/ 2 : totalBytes;
  if (sampleCount == 0) return defaultWaveform;

  final blockSize = math.max(1, sampleCount ~/ samples);
  final filteredData = <double>[];

  final byteData = ByteData.sublistView(audioBytes);

  for (var i = 0; i < samples; i++) {
    final blockStart = blockSize * i;
    if (blockStart >= sampleCount) {
      filteredData.add(0.0);
      continue;
    }

    final currentBlockSize = math.min(blockSize, sampleCount - blockStart);
    var sum = 0.0;

    for (var j = 0; j < currentBlockSize; j++) {
      final index = blockStart + j;
      if (is16Bit) {
        final val = byteData.getInt16(index * 2, Endian.little);
        sum += val.abs() / 32768.0;
      } else {
        final val = byteData.getUint8(index);
        sum += (val - 128).abs() / 128.0;
      }
    }

    filteredData.add(sum / currentBlockSize);
  }

  final maxVal = filteredData.fold<double>(
    0.0,
    (prev, elem) => math.max(prev, elem),
  );
  if (maxVal > 0) {
    final multiplier = 1.0 / maxVal;
    return filteredData.map((n) => (n * multiplier).clamp(0.0, 1.0)).toList();
  }

  return filteredData;
}

/// Parses duration in seconds from a standard WAV file header.
int extractAudioDurationFromWav(Uint8List bytes) {
  if (bytes.length < 44) return 0;
  try {
    final data = ByteData.sublistView(bytes);
    // Check 'RIFF'
    if (data.getUint32(0, Endian.big) != 0x52494646) return 0;
    // Check 'WAVE'
    if (data.getUint32(8, Endian.big) != 0x57415645) return 0;

    final byteRate = data.getUint32(28, Endian.little);
    if (byteRate <= 0) return 0;

    // Find 'data' chunk
    for (var i = 12; i < bytes.length - 8; i++) {
      if (bytes[i] == 0x64 &&
          bytes[i + 1] == 0x61 &&
          bytes[i + 2] == 0x74 &&
          bytes[i + 3] == 0x61) {
        final dataSize = data.getUint32(i + 4, Endian.little);
        return (dataSize / byteRate).round();
      }
    }
  } catch (_) {}
  return 0;
}

/// Parses duration in seconds from an MP4/MOV box container (`mvhd` atom).
int extractVideoDurationFromMp4(Uint8List bytes) {
  if (bytes.length < 32) return 0;
  try {
    final data = ByteData.sublistView(bytes);
    final len = bytes.length;

    for (var i = 0; i < len - 32; i++) {
      // Find 'mvhd' atom
      if (bytes[i] == 0x6D && // 'm'
          bytes[i + 1] == 0x76 && // 'v'
          bytes[i + 2] == 0x68 && // 'h'
          bytes[i + 3] == 0x64) {
        // 'd'
        final version = bytes[i + 4];
        if (version == 0) {
          final timeScale = data.getUint32(i + 16, Endian.big);
          final duration = data.getUint32(i + 20, Endian.big);
          if (timeScale > 0) {
            return (duration / timeScale).round();
          }
        } else if (version == 1) {
          final timeScale = data.getUint32(i + 24, Endian.big);
          final duration = data.getUint64(i + 28, Endian.big);
          if (timeScale > 0) {
            return (duration / timeScale).round();
          }
        }
        break;
      }
    }
  } catch (_) {}
  return 0;
}

/// Service for calculating waveforms and media durations.
class MediaUtils {
  final FileStorage _storage;
  MediaUtils([FileStorage? storage])
    : _storage = storage ?? FileStorage.instance;

  Future<List<double>?> getWaveform(String ref, FileTypeCategory type) async {
    if (type != FileTypeCategory.voice && type != FileTypeCategory.audio) {
      return null;
    }
    final bytes = await _storage.getBytes(ref);
    if (bytes == null || bytes.isEmpty) return defaultWaveform;
    return processWaveform(bytes, samples: 50);
  }

  Future<int> getDuration(String ref, FileTypeCategory type) async {
    final bytes = await _storage.getBytes(ref);
    if (bytes == null || bytes.isEmpty) return 0;

    switch (type) {
      case FileTypeCategory.voice:
      case FileTypeCategory.audio:
        final wavDuration = extractAudioDurationFromWav(bytes);
        if (wavDuration > 0) return wavDuration;
        return 0;
      case FileTypeCategory.video:
        return extractVideoDurationFromMp4(bytes);
      default:
        return 0;
    }
  }
}
