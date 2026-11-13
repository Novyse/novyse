import 'package:dio/dio.dart';

import '../api_response.dart';

// Comms (calls) room and token endpoints.

class CommsModule {
  final Dio _dio;
  final CommsRoomModule room;

  CommsModule(this._dio) : room = CommsRoomModule(_dio);

  /// Retrieve a token for the vocal communication server.
  Future<({bool success, String? token, String? url})> getToken(
    String chatUUID, {
    int sub = 0,
  }) async {
    final res = await _dio.get(
      '/comms/token',
      queryParameters: {'chatUUID': chatUUID, 'sub': sub},
    );
    if (isOk(res)) {
      final d = responseData(res);
      return (
        success: true,
        token: d['token'] as String?,
        url: d['url'] as String?,
      );
    }
    return (success: false, token: null, url: null);
  }
}

class CommsRoomModule {
  final Dio _dio;
  CommsRoomModule(this._dio);

  /// Get room info, participants and activities.
  Future<
    ({bool success, dynamic room, dynamic participants, dynamic activities})
  >
  get(
    String chatUUID, {
    int sub = 0,
  }) async {
    try {
      final res = await _dio.get(
        '/comms/room',
        queryParameters: {'chatUUID': chatUUID, 'sub': sub},
      );
      if (isOk(res)) {
        final d = responseData(res);
        return (
          success: true,
          room: d['room'],
          participants: d['participants'],
          activities: d['activities'],
        );
      }
      return (
        success: false,
        room: null,
        participants: null,
        activities: null,
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return (success: true, room: [], participants: [], activities: []);
      }
      rethrow;
    }
  }
}
