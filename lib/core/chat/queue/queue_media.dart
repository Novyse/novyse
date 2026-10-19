import 'package:flutter/foundation.dart';
import 'package:novyse/core/storage/file/file.dart';
import 'package:novyse/core/storage/file/waveform_generator.dart';

/// Normalises a raw attachment list into mutable string-keyed maps.
List<Map<String, dynamic>> normalizeQueueFiles(List<dynamic>? rawFiles) {
  if (rawFiles == null) return <Map<String, dynamic>>[];
  return rawFiles
      .map((f) => f is Map ? Map<String, dynamic>.from(f) : <String, dynamic>{})
      .toList();
}

/// Fills in `duration` for audio/video files and `waveform` for voice messages.
/// Failures are logged and skipped: the attachment is still uploadable without
/// its metadata, so this never blocks a send.
/// Set [onlyNewUploads] to leave already-uploaded attachments untouched.
Future<void> enrichLocalMediaMetadata(
  List<Map<String, dynamic>> files, {
  bool onlyNewUploads = false,
}) async {
  for (final file in files) {
    if (onlyNewUploads && file['uuid'] != null) continue;

    final uri = file['uri'] as String?;
    final path = file['path'] as String?;
    final bytes = file['bytes'] as Uint8List?;
    if (uri == null && path == null && bytes == null) continue;

    try {
      final name = (file['name'] ?? '').toString();
      final mime = (file['mimeType'] ?? '').toString();
      final resolvedMime = getMimeType({'mimeType': mime, 'name': name});
      final category = getFileType(resolvedMime, name.isEmpty ? null : name);

      final isMedia =
          category == FileTypeCategory.audio ||
          category == FileTypeCategory.voice ||
          category == FileTypeCategory.video;

      final needsDuration = isMedia && file['duration'] == null;
      final needsWaveform =
          category == FileTypeCategory.voice && file['waveform'] == null;
      if (!needsDuration && !needsWaveform) continue;

      // Waveform decoding needs the real bytes on web; native platforms can
      // decode straight from the local path.
      final decodePath = kIsWeb ? null : (path ?? uri);
      final fileBytes =
          bytes ??
          (needsWaveform && kIsWeb && uri != null
              ? await FileStorage.instance.getBytes(uri)
              : null);

      if (needsDuration) {
        final duration = await MediaDuration.read(
          uri: path ?? uri,
          bytes: fileBytes,
          name: name,
          mimeType: resolvedMime,
        );
        if (duration != null && duration > 0) {
          file['duration'] = duration;
        }
      }

      if (needsWaveform) {
        final hasBytes = fileBytes != null && fileBytes.isNotEmpty;
        final hasPath = decodePath != null && decodePath.isNotEmpty;
        if (!hasBytes && !hasPath) continue;

        final waveform = await WaveformGenerator.fromFile(
          bytes: fileBytes,
          path: decodePath,
        );
        // A failed decode yields all-zero bars; don't persist those.
        if (waveform.any((value) => value > 0)) {
          file['waveform'] = waveform;
        }
      }
    } catch (e) {
      debugPrint('[ChatQueue] Local media metadata failed: $e');
    }
  }
}
