import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint, kDebugMode;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/services/auth.dart';
import 'package:novyse/core/utils/platform.dart';

/// Builds a [Dio] client with platform headers, auth injection, session
/// persistence and the update-required interceptor.
Dio createDefaultDio({Map<String, dynamic>? extraHeaders}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'x-platform': currentPlatform.name,
        'x-operating-system': currentOS.name,
        'x-app-version': config.appVersion,
        ...?extraHeaders,
      },
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final skipAuth = options.extra['skipAuth'] == true;
        if (!skipAuth) {
          final accessToken = await auth.token.get();
          if (accessToken != null && accessToken.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $accessToken';
          }
        }
        return handler.next(options);
      },
      onResponse: (response, handler) async {
        // Persist session ID when the server sends one.
        final newSessionId = response.headers.value('x-set-session-id');
        if (newSessionId != null) {
          switch (currentPlatform) {
            case AppPlatform.mobile:
            case AppPlatform.desktop:
              const storage = FlutterSecureStorage();
              await storage.write(key: 'sessionId', value: newSessionId);
              break;
            case AppPlatform.web:
              break;
          }
        }

        if (kDebugMode) {
          debugPrint(
            'Response: ${response.requestOptions.method.toUpperCase()} '
            '${response.requestOptions.path} ${response.data}',
          );
        }

        return handler.next(response);
      },
      onError: (error, handler) async {
        final status = error.response?.statusCode;

        if (status == 426) {
          debugPrint('Client update required (426 Upgrade Required)');
          final responseData = error.response?.data;
          final innerData = responseData is Map ? responseData['data'] : null;
          final minVersion = innerData is Map
              ? innerData['minVersion'] as String?
              : null;
          EventBus.instance.emit(
            ClientUpdateRequiredEvent(minVersion: minVersion),
          );
          return handler.next(error);
        }

        return handler.next(error);
      },
    ),
  );

  if (kDebugMode) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          debugPrint(
            'Starting Request: ${options.method.toUpperCase()} ${options.path} '
            '${options.queryParameters} ${options.data ?? ''}',
          );
          return handler.next(options);
        },
      ),
    );
  }

  return dio;
}
