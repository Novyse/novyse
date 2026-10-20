import 'package:dio/dio.dart';

// Unauthenticated system endpoints (no version gate, no auth token).

class SystemModule {
  final Dio _dio;
  SystemModule(this._dio);

  /// Pulls the latest released version from `GET /health`
  Future<({bool success, String? version})> getVersion() async {
    try {
      final res = await _dio.get(
        '/health',
        options: Options(extra: {'skipAuth': true}),
      );
      final data = res.data;
      if (data is Map && data['status'] == 'ok') {
        final version = data['version'];
        if (version is String && version.isNotEmpty) {
          return (success: true, version: version);
        }
      }
      return (success: false, version: null);
    } catch (_) {
      return (success: false, version: null);
    }
  }
}
