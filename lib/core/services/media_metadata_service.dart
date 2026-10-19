import 'dart:typed_data';

import 'package:flutter/foundation.dart' show debugPrint, kIsWeb;
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/storage/file/media_duration.dart';
import 'package:novyse/core/storage/file/waveform_generator.dart';

/// Generates and persists the waveform for a locally available voice message.
///
/// Returns the generated waveform, or `null` for non-voice files and when the
/// file cannot be decoded.
Future<List<double>?> generateVoiceWaveform({
  required String fileUUID,
  required Uint8List bytes,
  required String name,
  required String mimeType,
  String? localUri,
}) async {
  final resolvedMime = getMimeType({'mimeType': mimeType, 'name': name});
  if (getFileType(resolvedMime, name) != FileTypeCategory.voice) {
    return null;
  }
  if (bytes.isEmpty) return null;

  try {
    final waveform = await WaveformGenerator.fromFile(
      bytes: bytes,
      path: kIsWeb ? null : localUri,
    );
    // A failed decode yields all-zero bars; don't persist those.
    if (waveform.isEmpty || !waveform.any((value) => value > 0)) {
      return null;
    }

    if (AppDatabase.instance.isOpen) {
      await AppDatabase.instance.file.update.waveform(fileUUID, waveform);
    }
    return waveform;
  } catch (e) {
    debugPrint('[MediaMetadata] Waveform generation failed for $fileUUID: $e');
    return null;
  }
}

/// Reads duration and voice waveform for a just-downloaded file, persists them
/// and emits a second `FileDownloadedEvent` with the derived metadata.
Future<void> enrichDownloadedMedia({
  required String fileUUID,
  required Uint8List bytes,
  required String name,
  required String mimeType,
  required String localUri,
}) async {
  try {
    final duration = await MediaDuration.read(
      uri: localUri,
      bytes: bytes,
      name: name,
      mimeType: mimeType,
    );
    final waveform = await generateVoiceWaveform(
      fileUUID: fileUUID,
      bytes: bytes,
      name: name,
      mimeType: mimeType,
      localUri: localUri,
    );

    if (duration == null && waveform == null) return;

    if (AppDatabase.instance.isOpen && duration != null && duration > 0) {
      await AppDatabase.instance.file.update.duration(fileUUID, duration);
    }

    GlobalEventEmitter.instance.fileDownloaded(
      fileUUID: fileUUID,
      uri: localUri,
      waveform: waveform,
      duration: duration,
    );
  } catch (e) {
    debugPrint('[MediaMetadata] Enrichment failed for $fileUUID: $e');
  }
}
