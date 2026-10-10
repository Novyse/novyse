import 'package:dio/dio.dart';

import '../api_response.dart';

// Local and remote search endpoints.

class SearchModule {
  final Dio _dio;
  SearchModule(this._dio);

  /// Search everything (users, chats, bots).
  Future<({bool success, Map<String, dynamic>? data})> all(String query) async {
    final res = await _dio.get(
      '/search/all',
      queryParameters: {'query': query},
    );
    if (isOk(res)) {
      return (
        success: true,
        data: Map<String, dynamic>.from(responseData(res)),
      );
    }
    return (success: false, data: null);
  }

  /// Search / trending GIFs via API gateway.
  Future<({bool success, Map<String, dynamic>? data, String? error})> gif({
    String query = '',
    int limit = 24,
    int page = 1,
    String provider = 'all',
  }) async {
    final res = await _dio.get(
      '/search/gif',
      queryParameters: {
        'query': query,
        'limit': limit.toString(),
        'page': page.toString(),
        'provider': provider,
      },
    );
    if (isOk(res)) {
      final raw = responseData(res);
      final data = raw is List
          ? {'items': raw, 'providers': []}
          : {
              'items': raw?['items'] ?? [],
              'providers': raw?['providers'] ?? [],
            };
      return (success: true, data: data, error: null);
    }
    return (success: false, data: null, error: res.data?['error']?.toString());
  }
}
