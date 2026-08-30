import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/storage/file/file_storage.dart';
import 'package:novyse/core/storage/file/file_type.dart';

typedef TransferProgressCallback = void Function({required int loaded, required int total});

/// S3 upload and download adapter using presigned URLs and Dio.
class S3Adapter {
  static final Map<String, CancelToken> _activeTransfers = {};
  final Dio _dio;
  final FileStorage _storage;

  S3Adapter({Dio? dio, FileStorage? storage})
      : _dio = dio ?? Dio(),
        _storage = storage ?? FileStorage.instance;

  /// Uploads a file to an S3 bucket using a presigned PUT URL with progress tracking.
  Future<bool> upload(
    String presignedUrl,
    String fileUriOrRef,
    String fileUUID, {
    TransferProgressCallback? onProgress,
    String? contentType,
  }) async {
    if (presignedUrl.isEmpty || fileUriOrRef.isEmpty) {
      throw ArgumentError('Presigned URL and file URI are required.');
    }

    final bytes = await _storage.getBytes(fileUriOrRef);
    if (bytes == null || bytes.isEmpty) {
      debugPrint('S3Adapter: Could not retrieve bytes for file: $fileUriOrRef');
      return false;
    }

    final cancelToken = CancelToken();
    _activeTransfers[fileUUID] = cancelToken;

    final resolvedMime = contentType ?? getMimeType(fileUriOrRef);

    try {
      if (onProgress != null) {
        onProgress(loaded: 0, total: bytes.length);
      }

      final response = await _dio.put(
        presignedUrl,
        data: Stream.fromIterable([bytes]),
        options: Options(
          headers: {
            'Content-Type': resolvedMime,
            'Content-Length': bytes.length.toString(),
          },
        ),
        cancelToken: cancelToken,
        onSendProgress: (sent, total) {
          if (onProgress != null) {
            onProgress(loaded: sent, total: total > 0 ? total : bytes.length);
          }
        },
      );

      return response.statusCode != null &&
          response.statusCode! >= 200 &&
          response.statusCode! < 300;
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) {
        debugPrint('S3Adapter upload cancelled for: $fileUUID');
        return false;
      }
      debugPrint('S3Adapter upload error for $fileUUID: $e');
      return false;
    } catch (e) {
      debugPrint('S3Adapter upload error: $e');
      return false;
    } finally {
      _activeTransfers.remove(fileUUID);
    }
  }

  /// Downloads a file from S3 using a presigned GET URL with progress tracking.
  Future<Uint8List?> download(
    String presignedUrl,
    String fileUUID, {
    TransferProgressCallback? onProgress,
  }) async {
    if (presignedUrl.isEmpty) {
      throw ArgumentError('Presigned URL is required.');
    }

    final cancelToken = CancelToken();
    _activeTransfers[fileUUID] = cancelToken;

    try {
      final response = await _dio.get<List<int>>(
        presignedUrl,
        options: Options(responseType: ResponseType.bytes),
        cancelToken: cancelToken,
        onReceiveProgress: (received, total) {
          if (onProgress != null) {
            onProgress(loaded: received, total: total > 0 ? total : 0);
          }
        },
      );

      if (response.statusCode != null &&
          response.statusCode! >= 200 &&
          response.statusCode! < 300 &&
          response.data != null) {
        final data = response.data!;
        return data is Uint8List ? data : Uint8List.fromList(data);
      }
      return null;
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) {
        debugPrint('S3Adapter download cancelled for: $fileUUID');
        return null;
      }
      debugPrint('S3Adapter download error for $fileUUID: $e');
      return null;
    } catch (e) {
      debugPrint('S3Adapter download error: $e');
      return null;
    } finally {
      _activeTransfers.remove(fileUUID);
    }
  }

  /// Cancels an active file transfer by its UUID.
  static void cancel(String fileUUID) {
    if (_activeTransfers.containsKey(fileUUID)) {
      _activeTransfers[fileUUID]?.cancel('Transfer cancelled by user.');
      _activeTransfers.remove(fileUUID);
    }
  }

  /// Checks if a file transfer is currently active.
  static bool isActive(String fileUUID) {
    return _activeTransfers.containsKey(fileUUID);
  }
}
