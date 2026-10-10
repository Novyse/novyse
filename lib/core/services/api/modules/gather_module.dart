import 'package:dio/dio.dart';

import '../api_response.dart';

// Gather (trending/discovery) endpoints.

class GatherModule {
  final Dio _dio;
  GatherModule(this._dio);

  /// Gather information about a user or chat by handle.
  Future<({bool success, Map<String, dynamic>? data})> handle(
    String query, {
    bool detailed = false,
  }) async {
    final path = detailed ? '/gather/handle' : '/gather/handle/essentials';
    final res = await _dio.get(path, queryParameters: {'query': query});
    if (isOk(res)) {
      return (
        success: true,
        data: Map<String, dynamic>.from(responseData(res)),
      );
    }
    return (success: false, data: null);
  }
}
