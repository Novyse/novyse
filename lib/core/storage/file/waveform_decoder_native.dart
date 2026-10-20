import 'dart:async';
import 'dart:ffi';
import 'dart:io';
import 'dart:isolate';
import 'dart:typed_data';

import 'package:ffi/ffi.dart';
import 'package:media_kit/generated/libmpv/bindings.dart' as mpv;
import 'package:novyse/core/storage/file/file_uri.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// Native PCM decoding for [WaveformGenerator.fromFile].
///
/// Using the `libmpv` of media_kit files are decoded locally with real PCM samples.
Future<Float32List?> decodePcm({Uint8List? bytes, String? path}) async {
  final result = _queue.then((_) => _decode(bytes: bytes, path: path));
  _queue = result.then((_) {}, onError: (_) {});
  return result;
}

Future<void> _queue = Future<void>.value();

Future<Float32List?> _decode({Uint8List? bytes, String? path}) async {
  Directory? scratchInput;

  try {
    var inputPath = _filePathFrom(path);
    if (inputPath == null || !File(inputPath).existsSync()) {
      if (bytes == null || bytes.isEmpty) return null;
      scratchInput = await _createScratch('novyse_wf_in_');
      inputPath = '${scratchInput.path}${Platform.pathSeparator}input.bin';
      await File(inputPath).writeAsBytes(bytes, flush: true);
    }

    final scratchOutput = await _createScratch('novyse_wf_out_');
    try {
      final outputPath =
          '${scratchOutput.path}${Platform.pathSeparator}pcm.s16';
      return await Isolate.run(() => _decodeToPcm(inputPath!, outputPath));
    } finally {
      _deleteQuietly(scratchOutput);
    }
  } catch (_) {
    return null;
  } finally {
    if (scratchInput != null) _deleteQuietly(scratchInput);
  }
}

/// Converts raw mono signed 16-bit PCM into samples in the `-1.0..1.0` range.
///
/// mpv is configured to write `s16` samples in native byte order.
Float32List? decodePcm16(Uint8List bytes) {
  if (bytes.length < 2) return null;
  final count = bytes.length ~/ 2;
  final data = ByteData.sublistView(bytes);
  final out = Float32List(count);
  for (var i = 0; i < count; i++) {
    out[i] = data.getInt16(i * 2, Endian.host) / 32768.0;
  }
  return out;
}

/// Creates a scratch directory inside the app's temporary folder.
Future<Directory> _createScratch(String prefix) async {
  Directory root;
  try {
    root = await getTemporaryDirectory();
  } catch (_) {
    root = Directory.systemTemp;
  }
  return root.createTemp(prefix);
}

/// Converts an absolute path or `file://` URI into a filesystem path.
String? _filePathFrom(String? path) {
  if (path == null || path.isEmpty) return null;
  final resolved = filePathFromUri(path);
  return p.isAbsolute(resolved) ? resolved : null;
}

void _deleteQuietly(Directory directory) {
  try {
    directory.deleteSync(recursive: true);
  } catch (_) {}
}

// mpv decode (runs in a background isolate: `mpv_wait_event` is blocking).
// The audio output is raw mono s16 PCM at 8 kHz.

Float32List? _decodeToPcm(String inputPath, String outputPath) {
  final library = _openLibMpv();
  if (library == null) return null;

  final api = mpv.MPV(library);
  final ctx = api.mpv_create();
  if (ctx.address == 0) return null;

  var finished = false;
  try {
    // Options must be set before mpv_initialize.
    _setOption(api, ctx, 'config', 'no');
    _setOption(api, ctx, 'terminal', 'no');
    _setOption(api, ctx, 'msg-level', 'all=no');
    _setOption(api, ctx, 'audio-display', 'no');
    _setOption(api, ctx, 'vid', 'no');
    _setOption(api, ctx, 'vo', 'null');
    _setOption(api, ctx, 'ao', 'pcm');
    if (_setOption(api, ctx, 'ao-pcm-file', outputPath) < 0) return null;
    if (_setOption(api, ctx, 'ao-pcm-waveheader', 'no') < 0) return null;
    if (_setOption(api, ctx, 'audio-format', 's16') < 0) return null;
    if (_setOption(api, ctx, 'audio-samplerate', '8000') < 0) return null;
    if (_setOption(api, ctx, 'audio-channels', 'mono') < 0) return null;
    _setOption(api, ctx, 'keep-open', 'no');
    // Stay alive until the file is actually loaded: with `idle=no` mpv can
    // shut down before the `loadfile` command is processed.
    _setOption(api, ctx, 'idle', 'yes');

    if (api.mpv_initialize(ctx) < 0) return null;

    api.mpv_request_event(ctx, mpv.mpv_event_id.MPV_EVENT_END_FILE, 1);
    _loadFile(api, ctx, inputPath);

    final deadline = DateTime.now().add(const Duration(seconds: 20));
    while (DateTime.now().isBefore(deadline)) {
      final event = api.mpv_wait_event(ctx, 0.25);
      if (event.address == 0) continue;
      final eventId = event.ref.event_id;
      if (eventId == mpv.mpv_event_id.MPV_EVENT_END_FILE) {
        finished = true;
        break;
      }
      if (eventId == mpv.mpv_event_id.MPV_EVENT_SHUTDOWN) break;
    }
  } finally {
    // Closes the PCM output and flushes the raw file.
    api.mpv_terminate_destroy(ctx);
  }

  if (!finished) return null;
  final file = File(outputPath);
  if (!file.existsSync()) return null;
  return decodePcm16(file.readAsBytesSync());
}

DynamicLibrary? _openLibMpv() {
  final env = Platform.environment['LIBMPV_LIBRARY_PATH'];
  final candidates = <String>[
    if (env != null && env.isNotEmpty) env,
    if (Platform.isLinux) ...['libmpv.so', 'libmpv.so.2', 'libmpv.so.1'],
    if (Platform.isWindows) ...['libmpv-2.dll', 'mpv-2.dll'],
    if (Platform.isMacOS || Platform.isIOS) 'Mpv.framework/Mpv',
    if (Platform.isAndroid) 'libmpv.so',
  ];
  for (final candidate in candidates) {
    try {
      return DynamicLibrary.open(candidate);
    } catch (_) {}
  }
  return null;
}

int _setOption(
  mpv.MPV api,
  Pointer<mpv.mpv_handle> ctx,
  String name,
  String value,
) {
  final namePtr = name.toNativeUtf8();
  final valuePtr = value.toNativeUtf8();
  try {
    return api.mpv_set_option_string(ctx, namePtr.cast(), valuePtr.cast());
  } finally {
    malloc.free(namePtr);
    malloc.free(valuePtr);
  }
}

void _loadFile(mpv.MPV api, Pointer<mpv.mpv_handle> ctx, String path) {
  final args = calloc<Pointer<Int8>>(3);
  final command = 'loadfile'.toNativeUtf8();
  final pathPtr = path.toNativeUtf8();
  try {
    args[0] = command.cast<Int8>();
    args[1] = pathPtr.cast<Int8>();
    args[2] = nullptr;
    api.mpv_command(ctx, args);
  } finally {
    malloc.free(command);
    malloc.free(pathPtr);
    calloc.free(args);
  }
}
