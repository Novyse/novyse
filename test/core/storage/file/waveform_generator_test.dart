import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/storage/file/waveform_decoder_native.dart';
import 'package:novyse/core/storage/file/waveform_generator.dart';

void main() {
  group('WaveformGenerator.normalizeSamples', () {
    test('returns the requested number of normalized bars', () {
      final pcm = Float32List.fromList([
        for (var i = 0; i < 4410; i++) math.sin(i / 10) * 0.7,
      ]);

      final wave = WaveformGenerator.normalizeSamples(pcm, samples: 50);

      expect(wave.length, 50);
      expect(wave.every((v) => v >= 0.0 && v <= 1.0), isTrue);
      expect(wave.reduce(math.max), closeTo(1.0, 0.001));
    });

    test('is deterministic: identical PCM -> identical bars', () {
      final pcm = Float32List.fromList([
        for (var i = 0; i < 900; i++) 0.2 + 0.3 * math.sin(i / 7),
      ]);
      final a = WaveformGenerator.normalizeSamples(pcm, samples: 50);
      final b = WaveformGenerator.normalizeSamples(pcm, samples: 50);
      expect(a, equals(b));
    });

    test('keeps every bar visible even for silence', () {
      final wave = WaveformGenerator.normalizeSamples(
        Float32List(2000),
        samples: 50,
      );
      expect(wave.length, 50);
      expect(wave.every((v) => v > 0.0), isTrue);
    });

    test('empty PCM yields a neutral (zero) waveform', () {
      final wave = WaveformGenerator.normalizeSamples(
        Float32List(0),
        samples: 50,
      );
      expect(wave.length, 50);
      expect(wave.every((v) => v == 0.0), isTrue);
    });
  });

  group('decodePcm16', () {
    test('decodes signed 16-bit PCM into mono samples', () {
      final samples = <int>[0, 16384, -16384, 32767, -32768];
      final data = ByteData(samples.length * 2);
      for (var i = 0; i < samples.length; i++) {
        data.setInt16(i * 2, samples[i], Endian.host);
      }

      final pcm = decodePcm16(data.buffer.asUint8List());

      expect(pcm, isNotNull);
      expect(pcm!.length, samples.length);
      expect(pcm[0], closeTo(0.0, 1e-6));
      expect(pcm[1], closeTo(0.5, 1e-3));
      expect(pcm[2], closeTo(-0.5, 1e-3));
      expect(pcm[3], closeTo(1.0, 1e-3));
      expect(pcm[4], closeTo(-1.0, 1e-3));
    });

    test('ignores a trailing incomplete sample', () {
      final data = ByteData(5);
      data.setInt16(0, 0, Endian.host);
      data.setInt16(2, 16384, Endian.host);
      data.setUint8(4, 0x7F);

      final pcm = decodePcm16(data.buffer.asUint8List());

      expect(pcm, isNotNull);
      expect(pcm!.length, 2);
      expect(pcm[0], closeTo(0.0, 1e-6));
      expect(pcm[1], closeTo(0.5, 1e-3));
    });

    test('empty or single-byte input is not decoded', () {
      expect(decodePcm16(Uint8List(0)), isNull);
      expect(decodePcm16(Uint8List.fromList([0])), isNull);
    });
  });

  group('WaveformGenerator.fromFile', () {
    test('empty input yields the neutral waveform', () async {
      expect(await WaveformGenerator.fromFile(), WaveformGenerator.empty);
      expect(
        await WaveformGenerator.fromFile(bytes: Uint8List(0)),
        WaveformGenerator.empty,
      );
      expect(
        await WaveformGenerator.fromFile(path: ''),
        WaveformGenerator.empty,
      );
    });

    test('undecodable bytes yield the neutral waveform', () async {
      final junk = Uint8List.fromList(List.generate(500, (i) => (i * 7) % 256));
      expect(
        await WaveformGenerator.fromFile(bytes: junk),
        WaveformGenerator.empty,
      );
    });
  });
}
