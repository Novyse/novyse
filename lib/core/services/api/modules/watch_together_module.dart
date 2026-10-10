import 'package:dio/dio.dart';

// Watch-together session endpoints.

class WatchTogetherModule {
  final Dio _dio;
  WatchTogetherModule(this._dio);

  Future<Map<String, dynamic>> start(String roomUUID, String url) async {
    final res = await _dio.post(
      '/comms/watch-together/start',
      data: {'roomUUID': roomUUID, 'url': url},
    );
    return res.data;
  }

  Future<Map<String, dynamic>> play(String roomUUID, double timestamp) async {
    final res = await _dio.post(
      '/comms/watch-together/play',
      data: {'roomUUID': roomUUID, 'timestamp': timestamp},
    );
    return res.data;
  }

  Future<Map<String, dynamic>> pause(String roomUUID, double timestamp) async {
    final res = await _dio.post(
      '/comms/watch-together/pause',
      data: {'roomUUID': roomUUID, 'timestamp': timestamp},
    );
    return res.data;
  }

  Future<Map<String, dynamic>> seek(String roomUUID, double timestamp) async {
    final res = await _dio.post(
      '/comms/watch-together/seek',
      data: {'roomUUID': roomUUID, 'timestamp': timestamp},
    );
    return res.data;
  }

  Future<Map<String, dynamic>> stop(String roomUUID) async {
    final res = await _dio.post(
      '/comms/watch-together/stop',
      data: {'roomUUID': roomUUID},
    );
    return res.data;
  }
}
