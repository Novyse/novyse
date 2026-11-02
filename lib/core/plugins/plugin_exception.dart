import 'package:dio/dio.dart';

/// A failed call of the plugin or activity API.
///
/// The [code] is the one the SDK surfaces to the plugins, so the
/// bridge can map a failed request to the same vocabulary the plugin checks.
class PluginApiException implements Exception {
  const PluginApiException(this.status, this.code, this.message);

  /// HTTP status of the failed call, `0` when the request never left.
  final int status;

  /// Machine readable code, `E_*`.
  final String code;

  /// Human readable detail, from the API envelope when present.
  final String message;

  /// Maps a failed request to the SDK vocabulary.
  factory PluginApiException.fromDio(DioException error) {
    final status = error.response?.statusCode ?? 0;

    var detail = error.message ?? '';

    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      detail = data['message'] as String;
    }

    final code = switch (status) {
      403 => 'E_FORBIDDEN',
      404 => 'E_NOT_IN_ROOM',
      409 => 'E_LIMIT',
      413 => 'E_TOO_LARGE',
      429 => 'E_RATE_LIMITED',
      426 => 'E_UPDATE_REQUIRED',
      503 => 'E_UNAVAILABLE',
      0 => 'E_NETWORK',
      _ => status >= 500 ? 'E_NETWORK' : 'E_INTERNAL',
    };

    return PluginApiException(status, code, detail);
  }

  @override
  String toString() => 'PluginApiException($status, $code): $message';
}

/// A build of a plugin that could not be installed locally.
///
/// [code] is what the tile shows and what the retry decision is based on:
/// `download_failed`, `corrupt_bundle`, `unsupported_platform`.
class PluginCacheException implements Exception {
  const PluginCacheException(this.code, this.message);

  final String code;
  final String message;

  @override
  String toString() => 'PluginCacheException($code): $message';
}
