import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../api_response.dart';

// User profile, settings, badges and picture endpoints.

class UserModule {
  final Dio _dio;
  final UserProfileModule profile;
  final UserSettingsModule settings;

  UserModule(this._dio)
    : profile = UserProfileModule(_dio),
      settings = UserSettingsModule(_dio);

  /// Initialize user data after login.
  Future<Map<String, dynamic>> initialize() async {
    final res = await _dio.get('/user/initialize');
    if (isOk(res)) {
      final d = responseData(res);
      return {
        'success': true,
        'local': d['local'],
        'users': d['users'],
        'chats': d['chats'],
        'messages': d['messages'],
      };
    }
    return {'success': false};
  }

  /// Update user data using sync identifiers.
  Future<Map<String, dynamic>> update(
    Map<String, dynamic> local,
    List<Map<String, dynamic>> chats,
    List<Map<String, dynamic>> users,
  ) async {
    final res = await _dio.post(
      '/user/update',
      data: {'local': local, 'chats': chats, 'users': users},
    );
    if (isOk(res)) {
      final d = responseData(res);
      return {
        'success': true,
        'local': d['local'],
        'users': d['users'],
        'chats': d['chats'],
        'messages': d['messages'],
      };
    }
    return {'success': false};
  }

  /// Fetch presence information for a list of users.
  Future<({bool success, dynamic data})> presence(
    List<String> userUUIDs,
  ) async {
    if (userUUIDs.isEmpty) return (success: true, data: null);
    final res = await _dio.post(
      '/user/presence',
      data: {'userUUIDs': userUUIDs},
    );
    if (isOk(res)) return (success: true, data: responseData(res));
    return (success: false, data: null);
  }
}

class UserSettingsModule {
  final Dio _dio;
  UserSettingsModule(this._dio);

  /// Pushes one synchronized preference value.
  /// Same-value retries converge naturally (server keeps last per key).
  Future<({bool success, int? userEventID})> updateSetting(
    String key,
    Object? value,
  ) async {
    try {
      final res = await _dio.put(
        '/user/settings/preferences',
        data: {'key': key, 'value': value},
      );
      if (isOk(res)) {
        final d = responseData(res);
        return (
          success: true,
          userEventID: (d?['userEventID'] as num?)?.toInt(),
        );
      }
      return (success: false, userEventID: null);
    } catch (e) {
      debugPrint('[Gateway] updateSetting $key failed: $e');
      return (success: false, userEventID: null);
    }
  }
}

class UserProfileModule {
  final UserProfilePictureModule picture;
  final UserProfileUpdateModule updateInfo;
  final UserProfileBadgesModule badges;
  final UserProfileGetModule get;

  UserProfileModule(Dio dio)
    : picture = UserProfilePictureModule(dio),
      updateInfo = UserProfileUpdateModule(dio),
      badges = UserProfileBadgesModule(dio),
      get = UserProfileGetModule(dio);

  /// Update user's profile information.
  @Deprecated('Use updateInfo.all() instead')
  Future<({bool success, int? profileEventID})> updateAll({
    String name = '',
    String surname = '',
    String biography = '',
  }) => updateInfo.all(name: name, surname: surname, biography: biography);
}

class UserProfilePictureModule {
  final Dio _dio;
  UserProfilePictureModule(this._dio);

  /// Request user's profile picture update.
  Future<
    ({bool success, String? fileUUID, String? uploadURL, String? expiresAt})
  >
  update(String name, String mimeType, int size) async {
    final res = await _dio.patch(
      '/user/profile/picture',
      data: {'name': name, 'mimeType': mimeType, 'size': size},
    );
    if (isOk(res)) {
      final d = responseData(res);
      return (
        success: true,
        fileUUID: d['fileUUID'] as String?,
        uploadURL: d['uploadURL'] as String?,
        expiresAt: d['expiresAt'] as String?,
      );
    }
    return (success: false, fileUUID: null, uploadURL: null, expiresAt: null);
  }

  /// Confirm user's profile picture update after successful upload.
  Future<({bool success, String? profilePictureUUID, int? profileEventID})>
  confirm(String fileUUID) async {
    final res = await _dio.post(
      '/user/profile/picture/confirm',
      data: {'fileUUID': fileUUID},
    );
    if (isOk(res)) {
      final d = responseData(res);
      return (
        success: true,
        profilePictureUUID: d['profilePictureUUID'] as String?,
        profileEventID: d['profileEventID'] as int?,
      );
    }
    return (success: false, profilePictureUUID: null, profileEventID: null);
  }
}

class UserProfileUpdateModule {
  final Dio _dio;
  UserProfileUpdateModule(this._dio);

  /// Update user's profile information.
  Future<({bool success, int? profileEventID})> all({
    String name = '',
    String surname = '',
    String biography = '',
  }) async {
    final res = await _dio.patch(
      '/user/profile',
      data: {'name': name, 'surname': surname, 'biography': biography},
    );
    if (isOk(res)) {
      return (
        success: true,
        profileEventID: responseData(res)['profileEventID'] as int?,
      );
    }
    return (success: false, profileEventID: null);
  }
}

class UserProfileBadgesModule {
  final Dio _dio;
  UserProfileBadgesModule(this._dio);

  /// Get user's badges.
  Future<({bool success, List? badges})> get(String userUUID) async {
    final res = await _dio.get(
      '/user/profile/badges',
      queryParameters: {'userUUID': userUUID},
    );
    if (isOk(res)) return (success: true, badges: responseData(res) as List);
    return (success: false, badges: null);
  }
}

class UserProfileGetModule {
  final Dio _dio;
  UserProfileGetModule(this._dio);

  /// Get user's profile information by handle.
  Future<({bool success, Map<String, dynamic>? user})> byHandle(
    String handle,
  ) async {
    final res = await _dio.get(
      '/user/profile/handle',
      queryParameters: {'handle': handle},
      options: Options(extra: {'skipAuth': true}),
    );
    if (isOk(res)) {
      return (
        success: true,
        user: Map<String, dynamic>.from(responseData(res)),
      );
    }
    return (success: false, user: null);
  }
}
