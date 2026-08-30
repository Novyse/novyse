import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/storage/file/file_storage.dart';
import 'package:novyse/core/storage/file/file_type.dart';

typedef TransferProgressCallback = void Function({
  required int loaded,
  required int total,
});

/// S3 upload and download adapter using presigned URLs and Dio.
class S3Adapter {
  static final S3Adapter instance = S3Adapter();
  static final Map<String, CancelToken> _activeTransfers = {};
  final Dio _dio;
  final FileStorage _storage;

  S3Adapter({Dio? dio, FileStorage? storage})
    : _dio = dio ?? Dio(),
      _storage = storage ?? FileStorage.instance;

  /// Uploads a file or byte array to an S3 bucket using a presigned PUT URL with progress tracking.
  Future<bool> upload({
    required String uploadURL,
    required String fileUUID,
    String? fileUriOrRef,
    Uint8List? bytes,
    String? mimeType,
    CancelToken? cancelToken,
    void Function(int sent, int total)? onProgress,
  }) async {
    if (uploadURL.isEmpty) {
      throw ArgumentError('Presigned uploadURL is required.');
    }

    final fileBytes =
        bytes ??
        (fileUriOrRef != null ? await _storage.getBytes(fileUriOrRef) : null);
    if (fileBytes == null || fileBytes.isEmpty) {
      debugPrint('S3Adapter: Could not retrieve bytes for file: $fileUUID');
      return false;
    }

    final token = cancelToken ?? CancelToken();
    _activeTransfers[fileUUID] = token;

    final resolvedMime =
        mimeType ??
        (fileUriOrRef != null ? getMimeType(fileUriOrRef) : defaultMimeType);

    try {
      if (onProgress != null) {
        onProgress(0, fileBytes.length);
      }

      final response = await _dio.put(
        uploadURL,
        data: Stream.fromIterable([fileBytes]),
        options: Options(
          headers: {
            'Content-Type': resolvedMime,
            'Content-Length': fileBytes.length.toString(),
          },
        ),
        cancelToken: token,
        onSendProgress: (sent, total) {
          if (onProgress != null) {
            onProgress(sent, total > 0 ? total : fileBytes.length);
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
  Future<Uint8List> download({
    required String downloadURL,
    required String fileUUID,
    CancelToken? cancelToken,
    void Function(int loaded, int total)? onProgress,
  }) async {
    if (downloadURL.isEmpty) {
      throw ArgumentError('Presigned downloadURL is required.');
    }

    final token = cancelToken ?? CancelToken();
    _activeTransfers[fileUUID] = token;

    try {
      final response = await _dio.get<List<int>>(
        downloadURL,
        options: Options(responseType: ResponseType.bytes),
        cancelToken: token,
        onReceiveProgress: (received, total) {
          if (onProgress != null) {
            onProgress(received, total > 0 ? total : 0);
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
      throw Exception(
        'Failed to download file from S3: status ${response.statusCode}',
      );
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) {
        debugPrint('S3Adapter download cancelled for: $fileUUID');
        throw Exception('Download cancelled');
      }
      debugPrint('S3Adapter download error for $fileUUID: $e');
      rethrow;
    } catch (e) {
      debugPrint('S3Adapter download error: $e');
      rethrow;
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
