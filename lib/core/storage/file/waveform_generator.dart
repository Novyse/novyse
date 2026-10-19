import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import 'waveform_decoder_native.dart'
    if (dart.library.js_interop) 'waveform_decoder_web.dart'
    as decoder;

/// Cross-platform waveform generation from an audio file.
class WaveformGenerator {
  WaveformGenerator._();

  static const int defaultSamples = 50;
  static final List<double> empty = List<double>.filled(defaultSamples, 0.0);

  /// The only generation entry point, used only on a locally stored file.
  ///
  /// [bytes] are the exact file content (required on the web); [path] is the
  /// local file location on native platforms. Returns [empty] when the file is
  /// missing or cannot be decoded.
  static Future<List<double>> fromFile({
    Uint8List? bytes,
    String? path,
    int samples = defaultSamples,
  }) async {
    if (samples <= 0) return empty;
    if ((bytes == null || bytes.isEmpty) && (path == null || path.isEmpty)) {
      return empty;
    }
    try {
      final pcm = await decoder.decodePcm(bytes: bytes, path: path);
      if (pcm == null || pcm.isEmpty) return empty;
      return normalizeSamples(pcm, samples: samples);
    } catch (e) {
      debugPrint('[WaveformGenerator] decode failed: $e');
      return empty;
    }
  }

  /// Converts decoded PCM samples into [samples] normalized bars (`0.0..1.0`).
  @visibleForTesting
  static List<double> normalizeSamples(
    Float32List pcm, {
    int samples = defaultSamples,
  }) {
    if (samples <= 0) return const <double>[];
    if (pcm.isEmpty) return List<double>.filled(samples, 0.0);

    final out = List<double>.filled(samples, 0.0);
    final blockSize = math.max(1, (pcm.length / samples).ceil());

    var peak = 0.0;
    for (var i = 0; i < samples; i++) {
      final start = i * blockSize;
      if (start >= pcm.length) break;

      final end = math.min(start + blockSize, pcm.length);
      var sumSquares = 0.0;
      for (var j = start; j < end; j++) {
        final value = pcm[j];
        sumSquares += value * value;
      }
      final rms = math.sqrt(sumSquares / (end - start));

      final bar = math.sqrt(rms);
      out[i] = bar;
      if (bar > peak) peak = bar;
    }

    if (peak > 0) {
      final scale = 1.0 / peak;
      for (var i = 0; i < samples; i++) {
        out[i] = (out[i] * scale).clamp(0.0, 1.0);
      }
    }

    for (var i = 0; i < samples; i++) {
      if (out[i] < 0.05) out[i] = 0.05;
    }
    return out;
  }
}
