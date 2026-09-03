import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/storage/file/file_storage.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/storage/file/s3_adapter.dart';

/// Centralized service for downloading, storing, and resolving chat file attachments and media.
class FileDownloadService {
  FileDownloadService._();
  static final FileDownloadService instance = FileDownloadService._();

  AppDatabase get _database => AppDatabase.instance;
  FileStorage get _storage => FileStorage.instance;
  Gateway get _gateway => apiGateway;
  S3Adapter get _s3Adapter => S3Adapter.instance;

  /// In-flight downloads map to avoid concurrent duplicate requests.
  final Map<String, Future<String?>> _inFlightDownloads = {};

  /// Checks whether a download for [fileUUID] is currently active.
  bool isDownloading(String fileUUID) =>
      _inFlightDownloads.containsKey(fileUUID);

  /// Downloads file metadata from the server, fetches file bytes from S3,
  /// saves to local storage, and updates SQLite database ref.
  Future<String?> downloadFile({
    required String fileUUID,
    String? name,
    String? mimeType,
    CancelToken? cancelToken,
    void Function(double progress)? onProgress,
  }) async {
    if (fileUUID.isEmpty) return null;

    if (_inFlightDownloads.containsKey(fileUUID)) {
      return await _inFlightDownloads[fileUUID];
    }

    final downloadFuture = _executeDownload(
      fileUUID: fileUUID,
      nameHint: name,
      mimeTypeHint: mimeType,
      cancelToken: cancelToken,
      onProgress: onProgress,
    );

    _inFlightDownloads[fileUUID] = downloadFuture;

    try {
      return await downloadFuture;
    } finally {
      _inFlightDownloads.remove(fileUUID);
    }
  }

  Future<String?> _executeDownload({
    required String fileUUID,
    String? nameHint,
    String? mimeTypeHint,
    CancelToken? cancelToken,
    void Function(double progress)? onProgress,
  }) async {
    try {
      // 1. Retrieve file metadata and presigned download URL from API Gateway
      final meta = await _gateway.file.retrieve(fileUUID);
      if (!meta.success ||
          meta.downloadURL == null ||
          meta.downloadURL!.isEmpty) {
        debugPrint(
          '[FileDownloadService] Gateway retrieve failed for $fileUUID',
        );
        return null;
      }

      final downloadURL = meta.downloadURL!;
      final finalName = meta.name ?? nameHint ?? fileUUID;
      final finalMimeType =
          meta.mimeType ?? mimeTypeHint ?? 'application/octet-stream';
      final finalSize = meta.size ?? 0;

      // 2. Insert or update file metadata in SQLite
      if (AppDatabase.instance.isOpen) {
        await _database.file.add(fileUUID, finalName, finalMimeType, finalSize);
      }

      // 3. Download bytes from S3 presigned URL
      final Uint8List bytes = await _s3Adapter.download(
        downloadURL: downloadURL,
        fileUUID: fileUUID,
        cancelToken: cancelToken,
        onProgress: (received, total) {
          final progress = total > 0 ? received / total : 0.0;
          onProgress?.call(progress);
          GlobalEventEmitter.instance.emit('file:download_progress', {
            'uuid': fileUUID,
            'loaded': received,
            'total': total,
            'progress': progress,
          });
        },
      );

      if (bytes.isEmpty) {
        debugPrint('[FileDownloadService] Downloaded 0 bytes for $fileUUID');
        return null;
      }

      // 4. Save bytes to local file storage
      final ext = finalName.contains('.')
          ? finalName.split('.').last
          : extensionFromMime(finalMimeType);
      final filename = ext.isNotEmpty ? '$fileUUID.$ext' : fileUUID;

      final saveResult = await _storage.save.byBytes(bytes, filename);
      if (saveResult.ref.isEmpty) {
        debugPrint(
          '[FileDownloadService] FileStorage save returned empty ref for $fileUUID',
        );
        return null;
      }

      // 5. Update local URI / ref in database
      final localUri = await _storage.read(saveResult.ref) ?? saveResult.ref;
      if (AppDatabase.instance.isOpen) {
        await _database.file.update.ref(fileUUID, saveResult.ref);
      }

      // 6. Emit completion event
      GlobalEventEmitter.instance.emit('file:downloaded', {
        'fileUUID': fileUUID,
        'uri': localUri,
        'ref': saveResult.ref,
      });

      return localUri;
    } catch (e) {
      debugPrint('[FileDownloadService] Error downloading file $fileUUID: $e');
      return null;
    }
  }

  /// Resolves the local URI for a file. If not present locally and [autoDownload] is true,
  /// downloads it in the background and returns the resolved local URI.
  Future<String?> getOrDownloadFile({
    required String fileUUID,
    String? ref,
    String? name,
    String? mimeType,
    bool autoDownload = true,
    void Function(double progress)? onProgress,
  }) async {
    // 1. Check if direct ref exists in local storage
    if (ref != null && ref.isNotEmpty) {
      final existingUri = await _storage.read(ref);
      if (existingUri != null && existingUri.isNotEmpty) {
        return existingUri;
      }
    }

    if (fileUUID.isEmpty) return null;

    // 2. Check if DB has a stored ref that exists locally
    if (AppDatabase.instance.isOpen) {
      try {
        final dbRef = await _database.file.get.ref(fileUUID);
        if (dbRef != null && dbRef.isNotEmpty) {
          final existingUri = await _storage.read(dbRef);
          if (existingUri != null && existingUri.isNotEmpty) {
            return existingUri;
          }
        }
      } catch (_) {}
    }

    // 3. If missing and autoDownload is requested, download it
    if (autoDownload) {
      return await downloadFile(
        fileUUID: fileUUID,
        name: name,
        mimeType: mimeType,
        onProgress: onProgress,
      );
    }

    return null;
  }
}

/// Riverpod provider for [FileDownloadService].
final fileDownloadServiceProvider = Provider<FileDownloadService>((ref) {
  return FileDownloadService.instance;
});
