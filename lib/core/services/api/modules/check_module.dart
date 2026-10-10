import 'package:dio/dio.dart';

import '../api_response.dart';

// Handle / handle-availability lookups.

class CheckModule {
  final Dio _dio;
  CheckModule(this._dio);

  /// Check if a handle is available.
  Future<({bool success, bool? available})> handle(String handle) async {
    final res = await _dio.get(
      '/check/handle',
      queryParameters: {'handle': handle},
      options: Options(extra: {'skipAuth': true}),
    );
    if (isOk(res)) {
      return (success: true, available: responseData(res)['available'] as bool);
    }
    return (success: false, available: null);
  }
}
