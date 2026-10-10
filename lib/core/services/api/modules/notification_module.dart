import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../api_response.dart';

// Push notification token endpoints.

class NotificationModule {
  final Dio _dio;
  NotificationModule(this._dio);

  /// Set the FCM push token for the current user.
  Future<bool> setFCMToken(String token) async {
    final res = await _dio.patch(
      '/notification/push-token',
      data: {'pushToken': token},
    );
    return isOk(res);
  }

  Future<bool> deleteFCMToken() async {
    try {
      final res = await _dio.delete('/notification/push-token');
      return isOk(res);
    } catch (e) {
      debugPrint('[Gateway] deleteFCMToken failed: $e');
      return false;
    }
  }
}
