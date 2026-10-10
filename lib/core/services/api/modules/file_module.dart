import 'package:dio/dio.dart';

import '../api_response.dart';

// File upload and download endpoints.

class FileModule {
  final Dio _dio;
  FileModule(this._dio);

  /// Retrieve a file download URL and metadata.
  Future<
    ({
      bool success,
      String? downloadURL,
      String? expiresAt,
      String? name,
      int? size,
      String? mimeType,
    })
  >
  retrieve(String fileUUID) async {
    final res = await _dio.get(
      '/file',
      queryParameters: {'fileUUID': fileUUID},
    );
    if (isOk(res)) {
      final d = responseData(res);
      return (
        success: true,
        downloadURL: d['downloadURL'] as String?,
        expiresAt: d['expiresAt'] as String?,
        name: d['name'] as String?,
        size: d['size'] as int?,
        mimeType: d['mimeType'] as String?,
      );
    }
    return (
      success: false,
      downloadURL: null,
      expiresAt: null,
      name: null,
      size: null,
      mimeType: null,
    );
  }

  /// Delete a file upload (cancel upload).
  Future<bool> delete(String fileUUID) async {
    final res = await _dio.delete(
      '/file',
      queryParameters: {'fileUUID': fileUUID},
    );
    return isOk(res);
  }
}
