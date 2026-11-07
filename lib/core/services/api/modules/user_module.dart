import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint, immutable;

import '../api_response.dart';

// User profile, settings, badges, images and customization endpoints.

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

/// A stop of a [ProfileGradient].
@immutable
class ProfileGradientStop {
  /// Hex color, `#RRGGBB` or `#RRGGBBAA`.
  final String color;

  /// Position of the stop, in percent (0-100).
  final double position;

  const ProfileGradientStop({required this.color, required this.position});

  Map<String, dynamic> toJson() => {'color': color, 'position': position};

  factory ProfileGradientStop.fromJson(Map<String, dynamic> json) {
    return ProfileGradientStop(
      color: json['color'] as String? ?? '',
      position: (json['position'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// Background of a profile field: the card, the name or the banner.
///
/// A single stop is a solid color, more stops are a gradient.
@immutable
class ProfileGradient {
  /// Angle of the gradient, in degrees (0-360).
  final double angle;

  /// Stops of the gradient, sorted by [ProfileGradientStop.position].
  final List<ProfileGradientStop> stops;

  const ProfileGradient({this.angle = 0, required this.stops});

  /// A gradient made of a single stop, that is a solid color.
  factory ProfileGradient.solid(String color, {double angle = 0}) {
    return ProfileGradient(
      angle: angle,
      stops: [ProfileGradientStop(color: color, position: 0)],
    );
  }

  Map<String, dynamic> toJson() => {
    'angle': angle,
    'stops': [for (final stop in stops) stop.toJson()],
  };

  /// Parses a gradient of a response, `null` when the field is removed.
  static ProfileGradient? fromJson(Object? json) {
    if (json is! Map) return null;
    final stops = json['stops'];
    if (stops is! List) return null;
    return ProfileGradient(
      angle: (json['angle'] as num?)?.toDouble() ?? 0,
      stops: [
        for (final stop in stops)
          if (stop is Map)
            ProfileGradientStop.fromJson(Map<String, dynamic>.from(stop)),
      ],
    );
  }
}

/// Reads the identifier of the profile event from the `data` of a response.
int? _profileEventID(Object? data) {
  if (data is! Map) return null;
  return (data['profileEventID'] as num?)?.toInt();
}

class UserProfileModule {
  /// Images of the profile, see [UserProfileImageModule].
  final UserProfileImageModule picture;
  final UserProfileImageModule banner;
  final UserProfileImageModule card;
  final UserProfileUpdateModule updateInfo;
  final UserProfileCustomizationModule customization;
  final UserProfileBadgesModule badges;
  final UserProfileGetModule get;

  UserProfileModule(Dio dio)
    : picture = UserProfileImageModule(
        dio,
        path: '/user/profile/picture',
        uuidKey: 'profilePictureUUID',
      ),
      banner = UserProfileImageModule(
        dio,
        path: '/user/profile/banner',
        uuidKey: 'bannerPictureUUID',
      ),
      card = UserProfileImageModule(
        dio,
        path: '/user/profile/card',
        uuidKey: 'cardPictureUUID',
      ),
      updateInfo = UserProfileUpdateModule(dio),
      customization = UserProfileCustomizationModule(dio),
      badges = UserProfileBadgesModule(dio),
      get = UserProfileGetModule(dio);
}

/// Prepares and confirms the upload of one of the images of a profile.
///
/// The picture and the banner accept any image, the card only a GIF; the
/// server rejects the other mime types.
class UserProfileImageModule {
  final Dio _dio;

  /// Endpoint of the image: `PATCH` prepares it, `POST .../confirm` applies it.
  final String path;

  /// Key of the image in the payload of the confirmation.
  final String uuidKey;

  UserProfileImageModule(
    this._dio, {
    required this.path,
    required this.uuidKey,
  });

  /// Request the update of the image, which answers with an upload link.
  Future<
    ({bool success, String? fileUUID, String? uploadURL, String? expiresAt})
  >
  update(String name, String mimeType, int size) async {
    final res = await _dio.patch(
      path,
      data: {'name': name, 'mimeType': mimeType, 'size': size},
    );
    if (isOk(res)) {
      final d = responseData(res);
      if (d is Map) {
        return (
          success: true,
          fileUUID: d['fileUUID'] as String?,
          uploadURL: d['uploadURL'] as String?,
          expiresAt: d['expiresAt'] as String?,
        );
      }
      return (success: true, fileUUID: null, uploadURL: null, expiresAt: null);
    }
    return (success: false, fileUUID: null, uploadURL: null, expiresAt: null);
  }

  /// Confirm the update of the image after the upload has completed.
  Future<({bool success, String? fileUUID, int? profileEventID})> confirm(
    String fileUUID,
  ) async {
    final res = await _dio.post('$path/confirm', data: {'fileUUID': fileUUID});
    if (isOk(res)) {
      final d = responseData(res);
      final confirmed = d is Map ? d[uuidKey] as String? : null;
      return (
        success: true,
        fileUUID: (confirmed == null || confirmed.isEmpty)
            ? fileUUID
            : confirmed,
        profileEventID: _profileEventID(d),
      );
    }
    return (success: false, fileUUID: null, profileEventID: null);
  }
}

class UserProfileUpdateModule {
  final Dio _dio;
  UserProfileUpdateModule(this._dio);

  /// Update user's profile information, customization included.
  ///
  /// The three text fields are always sent, empty strings included, so the
  /// call overwrites whatever the profile had. The birthday and the
  /// customization fields are sent only when they are given, which leaves
  /// them untouched otherwise.
  Future<({bool success, int? profileEventID})> all({
    String name = '',
    String surname = '',
    String biography = '',
    String? birthday,
    ProfileGradient? cardColor,
    String? cardEffect,
    String? cardBorder,
    ProfileGradient? nameColor,
    String? nameFont,
    String? nameEffect,
    String? avatarEffect,
    String? avatarBorder,
    ProfileGradient? bannerColor,
  }) => _send(
    _fields(
      name: name,
      surname: surname,
      biography: biography,
      birthday: birthday,
      cardColor: cardColor,
      cardEffect: cardEffect,
      cardBorder: cardBorder,
      nameColor: nameColor,
      nameFont: nameFont,
      nameEffect: nameEffect,
      avatarEffect: avatarEffect,
      avatarBorder: avatarBorder,
      bannerColor: bannerColor,
    ),
  );

  /// Update only the provided profile fields; `null` (untouched) fields are
  /// omitted from the PATCH body so unchanged values are never re-sent.
  /// With no fields at all it succeeds without touching the network.
  ///
  /// To remove a color use [UserProfileCustomizationModule.cardColor] (or the
  /// name/banner one), which sends the explicit `null` the removal needs.
  Future<({bool success, int? profileEventID})> partial({
    String? name,
    String? surname,
    String? biography,
    String? birthday,
    ProfileGradient? cardColor,
    String? cardEffect,
    String? cardBorder,
    ProfileGradient? nameColor,
    String? nameFont,
    String? nameEffect,
    String? avatarEffect,
    String? avatarBorder,
    ProfileGradient? bannerColor,
  }) => _send(
    _fields(
      name: name,
      surname: surname,
      biography: biography,
      birthday: birthday,
      cardColor: cardColor,
      cardEffect: cardEffect,
      cardBorder: cardBorder,
      nameColor: nameColor,
      nameFont: nameFont,
      nameEffect: nameEffect,
      avatarEffect: avatarEffect,
      avatarBorder: avatarBorder,
      bannerColor: bannerColor,
    ),
  );

  /// Update only the birthday; `null` removes it.
  Future<({bool success, int? profileEventID})> birthday(String? value) =>
      _sendTo('/user/profile/birthday', {'birthday': value});

  static Map<String, dynamic> _fields({
    String? name,
    String? surname,
    String? biography,
    String? birthday,
    ProfileGradient? cardColor,
    String? cardEffect,
    String? cardBorder,
    ProfileGradient? nameColor,
    String? nameFont,
    String? nameEffect,
    String? avatarEffect,
    String? avatarBorder,
    ProfileGradient? bannerColor,
  }) {
    return {
      'name': ?name,
      'surname': ?surname,
      'biography': ?biography,
      'birthday': ?birthday,
      'cardColor': ?cardColor?.toJson(),
      'cardEffect': ?cardEffect,
      'cardBorder': ?cardBorder,
      'nameColor': ?nameColor?.toJson(),
      'nameFont': ?nameFont,
      'nameEffect': ?nameEffect,
      'avatarEffect': ?avatarEffect,
      'avatarBorder': ?avatarBorder,
      'bannerColor': ?bannerColor?.toJson(),
    };
  }

  Future<({bool success, int? profileEventID})> _send(
    Map<String, dynamic> data,
  ) => _sendTo('/user/profile', data);

  Future<({bool success, int? profileEventID})> _sendTo(
    String path,
    Map<String, dynamic> data,
  ) async {
    if (data.isEmpty) return (success: true, profileEventID: null);
    final res = await _dio.patch(path, data: data);
    if (isOk(res)) {
      return (
        success: true,
        profileEventID: _profileEventID(responseData(res)),
      );
    }
    return (success: false, profileEventID: null);
  }
}

/// Updates one field of the customization of the profile at a time.
class UserProfileCustomizationModule {
  final Dio _dio;
  UserProfileCustomizationModule(this._dio);

  /// Update the background of the card; `null` removes it.
  Future<({bool success, int? profileEventID})> cardColor(
    ProfileGradient? color,
  ) => _patch('/user/profile/card/color', {'color': color?.toJson()});

  /// Update the effect of the card.
  Future<({bool success, int? profileEventID})> cardEffect(String effect) =>
      _patch('/user/profile/card/effect', {'effect': effect});

  /// Update the border of the card.
  Future<({bool success, int? profileEventID})> cardBorder(String border) =>
      _patch('/user/profile/card/border', {'border': border});

  /// Update the color of the name; `null` removes it.
  Future<({bool success, int? profileEventID})> nameColor(
    ProfileGradient? color,
  ) => _patch('/user/profile/name/color', {'color': color?.toJson()});

  /// Update the font of the name.
  Future<({bool success, int? profileEventID})> nameFont(String font) =>
      _patch('/user/profile/name/font', {'font': font});

  /// Update the effect of the name.
  Future<({bool success, int? profileEventID})> nameEffect(String effect) =>
      _patch('/user/profile/name/effect', {'effect': effect});

  /// Update the effect of the avatar.
  Future<({bool success, int? profileEventID})> avatarEffect(String effect) =>
      _patch('/user/profile/avatar/effect', {'effect': effect});

  /// Update the border of the avatar.
  Future<({bool success, int? profileEventID})> avatarBorder(String border) =>
      _patch('/user/profile/avatar/border', {'border': border});

  /// Update the color of the banner; `null` removes it.
  Future<({bool success, int? profileEventID})> bannerColor(
    ProfileGradient? color,
  ) => _patch('/user/profile/banner/color', {'color': color?.toJson()});

  Future<({bool success, int? profileEventID})> _patch(
    String path,
    Map<String, dynamic> data,
  ) async {
    final res = await _dio.patch(path, data: data);
    if (isOk(res)) {
      return (
        success: true,
        profileEventID: _profileEventID(responseData(res)),
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
