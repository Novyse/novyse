import 'dart:js_interop';
import 'dart:typed_data';

import 'package:web/web.dart' as web;

/// Web PCM decoding for [WaveformGenerator.fromFile].
///
/// Uses the Web Audio API, files are decoded locally with no dependency.
Future<Float32List?> decodePcm({Uint8List? bytes, String? path}) async {
  if (bytes == null || bytes.isEmpty) return null;

  web.AudioContext? context;
  try {
    context = web.AudioContext();
    final buffer = Uint8List.fromList(bytes).buffer;
    final audio = await context.decodeAudioData(buffer.toJS).toDart;
    if (audio.numberOfChannels <= 0 || audio.length <= 0) return null;
    return audio.getChannelData(0).toDart;
  } catch (_) {
    return null;
  } finally {
    try {
      await context?.close().toDart;
    } catch (_) {}
  }
}
