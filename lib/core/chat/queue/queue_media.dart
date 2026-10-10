import 'package:flutter/foundation.dart';
import 'package:novyse/core/storage/file/file.dart';

/// Normalises a raw attachment list into mutable string-keyed maps.
List<Map<String, dynamic>> normalizeQueueFiles(List<dynamic>? rawFiles) {
  if (rawFiles == null) return <Map<String, dynamic>>[];
  return rawFiles
      .map((f) => f is Map ? Map<String, dynamic>.from(f) : <String, dynamic>{})
      .toList();
}

/// Fills in `duration` and `waveform` for local media that lacks them.
/// Failures are logged and skipped: the attachment is still uploadable without
/// its metadata, so this never blocks a send.
///
/// Set [onlyNewUploads] to leave already-uploaded attachments untouched.
Future<void> enrichLocalMediaMetadata(
  List<Map<String, dynamic>> files, {
  bool onlyNewUploads = false,
}) async {
  for (final file in files) {
    if (onlyNewUploads && file['uuid'] != null) continue;

    final uri = file['uri'] as String?;
    final bytes = file['bytes'] as Uint8List?;

    if (file['duration'] != null || (uri == null && bytes == null)) continue;

    try {
      final fileBytes =
          bytes ??
          (uri != null ? await FileStorage.instance.getBytes(uri) : null);
      if (fileBytes == null) continue;

      final mime = (file['mimeType'] ?? '') as String;
      if (mime.contains('wav')) {
        file['duration'] = extractAudioDurationFromWav(fileBytes);
      } else if (mime.contains('mp4')) {
        file['duration'] = extractVideoDurationFromMp4(fileBytes);
      }
      if (file['waveform'] == null &&
          (mime.contains('audio') || mime.contains('wav'))) {
        file['waveform'] = processWaveform(fileBytes);
      }
    } catch (e) {
      debugPrint('[ChatQueue] Local media metadata failed: $e');
    }
  }
}
