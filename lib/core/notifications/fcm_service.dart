import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/services/auth.dart' as auth_service;
import 'package:novyse/core/utils/platform.dart';

const _kFcmTokenKey = 'fcm_push_token';

/// FCM token sync and message stream (mobile + web only).
class FcmService {
  FcmService._();
  static final FcmService instance = FcmService._();

  bool _initialized = false;
  void Function(RemoteMessage message)? onForegroundMessage;

  bool get isSupported {
    if (kIsWeb) return true;
    return currentOS == AppOS.android || currentOS == AppOS.ios;
  }

  Future<void> init({
    required void Function(RemoteMessage message) onMessage,
  }) async {
    if (!isSupported || _initialized) return;
    _initialized = true;
    onForegroundMessage = onMessage;

    try {
      await FirebaseMessaging.instance.setAutoInitEnabled(true);

      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      debugPrint(
        '[FcmService] Permission: ${settings.authorizationStatus}',
      );

      FirebaseMessaging.onMessage.listen((message) {
        debugPrint('[FcmService] Foreground FCM: ${message.messageId}');
        onForegroundMessage?.call(message);
      });

      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        debugPrint('[FcmService] Opened from FCM: ${message.messageId}');
      });

      FirebaseMessaging.instance.onTokenRefresh.listen((token) async {
        debugPrint('[FcmService] Token refreshed');
        await saveToken(token);
      });

      await updateToken();
    } catch (e, st) {
      debugPrint('[FcmService] init failed: $e\n$st');
    }
  }

  Future<void> updateToken() async {
    if (!isSupported) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        await saveToken(token);
      }
    } catch (e) {
      debugPrint('[FcmService] getToken failed: $e');
    }
  }

  Future<void> saveToken(String token) async {
    final authToken = await auth_service.auth.token.get();
    if (authToken == null || authToken.isEmpty) {
      debugPrint('[FcmService] Not logged in, skip token sync');
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_kFcmTokenKey);
    if (saved == token) return;

    final ok = await Gateway.instance.notification.setFCMToken(token);
    if (ok) {
      await prefs.setString(_kFcmTokenKey, token);
      debugPrint('[FcmService] Push token synced');
    }
  }
}
