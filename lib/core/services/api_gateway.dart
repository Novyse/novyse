import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kDebugMode, debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/core/services/auth.dart';
import 'package:novyse/core/stores/network_store.dart';

// TODO: import event emitter once implemented
// import 'package:novyse/core/utils/events/event_emitter.dart';

/// URLs that should bypass the sync/connectivity check.
const _bypassSyncUrls = {
  '/user/update',
  '/user/initialize',
  '/notification/push-token',
};

/// Provider for the pre-configured [Dio] instance using Riverpod's [Ref].
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'x-platform': currentPlatform.name,
        'x-operating-system': currentOS.name,
        'x-app-version': config.appVersion,
      },
    ),
  );

  // Request interceptor: auth token + connectivity guard
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final networkState = ref.read(networkProvider);
        final skipAuth = options.extra['skipAuth'] == true;
        final shouldBypass = _bypassSyncUrls.contains(options.path) || skipAuth;

        if (!shouldBypass) {
          if (!networkState.isConnected) {
            return handler.reject(
              DioException(requestOptions: options, message: 'Network offline'),
            );
          }
          if (!networkState.isSynced) {
            return handler.reject(
              DioException(
                requestOptions: options,
                message: 'App not synced yet',
              ),
            );
          }
        }

        if (!skipAuth) {
          final accessToken = await auth.token.get();
          if (accessToken != null) {
            options.headers['Authorization'] = 'Bearer $accessToken';
          }
        }

        return handler.next(options);
      },

      // Response interceptor: session-id + error handling
      onResponse: (response, handler) async {
        // Clear API error on success.
        ref.read(networkProvider.notifier).setApiError(null);

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
              // Web handles sessions via cookies – nothing to do.
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
          // TODO: eventEmitter.emit('clientUpdateRequired', error.response?.data?['data']);
          return handler.next(error);
        }

        if (status == 500) {
          ref.read(networkProvider.notifier).setApiError('Server error (500)');
        }

        return handler.next(error);
      },
    ),
  );

  // Logging interceptor (debug only)
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        if (kDebugMode) {
          debugPrint(
            'Starting Request: ${options.method.toUpperCase()} ${options.path} '
            '${options.queryParameters} ${options.data ?? ''}',
          );
        }
        return handler.next(options);
      },
    ),
  );

  return dio;
});

// Helpers

/// Shorthand for extracting the `success` field from the standard API envelope.
bool _ok(Response res) => res.data['success'] == true;

/// Shorthand for `res.data['data']`.
dynamic _data(Response res) => res.data['data'];

//
//  G A T E W A Y
//

/// Riverpod provider for accessing the [Gateway].
final apiGatewayProvider = Provider<Gateway>((ref) {
  final dio = ref.watch(dioProvider);
  return Gateway(dio);
});

class Gateway {
  Gateway(Dio dio)
    : check = CheckModule(dio),
      user = UserModule(dio),
      search = SearchModule(dio),
      gather = GatherModule(dio),
      chat = ChatModule(dio),
      message = MessageModule(dio),
      file = FileModule(dio),
      comms = CommsModule(dio),
      watchTogether = WatchTogetherModule(dio),
      notification = NotificationModule(dio);

  final CheckModule check;
  final UserModule user;
  final SearchModule search;
  final GatherModule gather;
  final ChatModule chat;
  final MessageModule message;
  final FileModule file;
  final CommsModule comms;
  final WatchTogetherModule watchTogether;
  final NotificationModule notification;
}

// check

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
    if (_ok(res)) {
      return (success: true, available: _data(res)['available'] as bool);
    }
    return (success: false, available: null);
  }
}

// user

class UserModule {
  final Dio _dio;
  final UserProfileModule profile;

  UserModule(this._dio) : profile = UserProfileModule(_dio);

  /// Initialize user data after login.
  Future<Map<String, dynamic>> initialize() async {
    final res = await _dio.get('/user/initialize');
    if (_ok(res)) {
      final d = _data(res);
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
    if (_ok(res)) {
      final d = _data(res);
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
  Future<({bool success, List? data})> presence(List<String> userUUIDs) async {
    if (userUUIDs.isEmpty) return (success: true, data: []);
    final res = await _dio.post(
      '/user/presence',
      data: {'userUUIDs': userUUIDs},
    );
    if (_ok(res)) return (success: true, data: _data(res) as List);
    return (success: false, data: null);
  }
}

// user.profile

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
    if (_ok(res)) {
      final d = _data(res);
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
    if (_ok(res)) {
      final d = _data(res);
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
    if (_ok(res)) {
      return (
        success: true,
        profileEventID: _data(res)['profileEventID'] as int?,
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
    if (_ok(res)) return (success: true, badges: _data(res) as List);
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
    if (_ok(res)) {
      return (success: true, user: Map<String, dynamic>.from(_data(res)));
    }
    return (success: false, user: null);
  }
}

// search

class SearchModule {
  final Dio _dio;
  SearchModule(this._dio);

  /// Search everything (users, chats, bots).
  Future<({bool success, Map<String, dynamic>? data})> all(String query) async {
    final res = await _dio.get(
      '/search/all',
      queryParameters: {'query': query},
    );
    if (_ok(res)) {
      return (success: true, data: Map<String, dynamic>.from(_data(res)));
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
    if (_ok(res)) {
      final raw = _data(res);
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

// gather

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
    if (_ok(res)) {
      return (success: true, data: Map<String, dynamic>.from(_data(res)));
    }
    return (success: false, data: null);
  }
}

// chat

class ChatModule {
  final Dio _dio;
  final ChatPictureModule picture;
  final ChatPinModule pin;
  final ChatSubModule sub;

  ChatModule(this._dio)
    : picture = ChatPictureModule(_dio),
      pin = ChatPinModule(_dio),
      sub = ChatSubModule(_dio);

  /// Create a new chat.
  Future<Map<String, dynamic>> create(
    String type, {
    List<String> memberUUIDs = const [],
    String? name,
    String? handle,
  }) async {
    assert(type.isNotEmpty);
    if (type == 'DM') {
      assert(memberUUIDs.length == 1, 'DM requires exactly 1 member');
    }
    final res = await _dio.post(
      '/chat/create',
      data: {
        'type': type,
        'memberUUIDs': memberUUIDs,
        if (name != null) 'name': name,
        if (handle != null && handle.isNotEmpty) 'handle': handle,
      },
    );
    if (_ok(res)) {
      final d = _data(res);
      return {'success': true, 'chat': d['chat'], 'users': d['users']};
    }
    return {'success': false};
  }

  /// Join a chat by its handle.
  Future<Map<String, dynamic>> join(String handle) async {
    assert(handle.isNotEmpty, 'Handle is required to join a chat');
    final res = await _dio.post('/chat/join', data: {'handle': handle});
    if (_ok(res)) {
      final d = _data(res);
      return {'success': true, 'chat': d['chat'], 'users': d['users']};
    }
    return {'success': false};
  }

  /// Rename a chat.
  Future<({bool success, String? name, int? chatEventID})> rename(
    String chatUUID,
    String name,
  ) async {
    assert(chatUUID.isNotEmpty && name.isNotEmpty);
    final res = await _dio.patch(
      '/chat/rename',
      data: {'chatUUID': chatUUID, 'name': name},
    );
    if (_ok(res)) {
      final d = _data(res);
      return (
        success: true,
        name: d['name'] as String?,
        chatEventID: d['chatEventID'] as int?,
      );
    }
    return (success: false, name: null, chatEventID: null);
  }
}

class ChatPictureModule {
  final Dio _dio;
  ChatPictureModule(this._dio);

  /// Request an upload URL for a chat picture.
  Future<
    ({bool success, String? fileUUID, String? uploadURL, String? expiresAt})
  >
  requestUpload(String chatUUID, String name, String mimeType, int size) async {
    final res = await _dio.patch(
      '/chat/picture',
      data: {
        'chatUUID': chatUUID,
        'name': name,
        'mimeType': mimeType,
        'size': size,
      },
    );
    if (_ok(res)) {
      final d = _data(res);
      return (
        success: true,
        fileUUID: d['fileUUID'] as String?,
        uploadURL: d['uploadURL'] as String?,
        expiresAt: d['expiresAt'] as String?,
      );
    }
    return (success: false, fileUUID: null, uploadURL: null, expiresAt: null);
  }

  /// Confirm a chat picture upload.
  Future<({bool success, String? pictureUUID, int? chatEventID})> confirm(
    String chatUUID,
    String fileUUID,
  ) async {
    final res = await _dio.post(
      '/chat/picture/confirm',
      data: {'chatUUID': chatUUID, 'fileUUID': fileUUID},
    );
    if (_ok(res)) {
      final d = _data(res);
      return (
        success: true,
        pictureUUID: d['pictureUUID'] as String?,
        chatEventID: d['chatEventID'] as int?,
      );
    }
    return (success: false, pictureUUID: null, chatEventID: null);
  }
}

class ChatPinModule {
  final Dio _dio;
  ChatPinModule(this._dio);

  /// Pin a chat.
  Future<({bool success, int? position, int? userEventID})> add(
    String chatUUID,
    int position,
  ) async {
    final res = await _dio.put(
      '/chat/pin',
      data: {'chatUUID': chatUUID, 'position': position},
    );
    final d = _data(res);
    return (
      success: _ok(res),
      position: d?['position'] as int?,
      userEventID: d?['userEventID'] as int?,
    );
  }

  /// Unpin a chat.
  Future<({bool success, int? userEventID})> remove(String chatUUID) async {
    final res = await _dio.delete('/chat/pin', data: {'chatUUID': chatUUID});
    if (_ok(res)) {
      return (success: true, userEventID: _data(res)?['userEventID'] as int?);
    }
    return (success: false, userEventID: null);
  }
}

class ChatSubModule {
  final Dio _dio;
  ChatSubModule(this._dio);

  /// Create a new sub-channel in a forum chat.
  Future<({bool success, Map<String, dynamic>? sub})> create(
    String chatUUID,
    String name,
    String type,
  ) async {
    final res = await _dio.post(
      '/chat/sub/create',
      data: {'chatUUID': chatUUID, 'name': name, 'type': type},
    );
    if (_ok(res)) {
      return (success: true, sub: Map<String, dynamic>.from(_data(res)));
    }
    return (success: false, sub: null);
  }

  /// Rename a sub-channel.
  Future<bool> rename(String chatUUID, int id, String name) async {
    final res = await _dio.patch(
      '/chat/sub/rename',
      data: {'chatUUID': chatUUID, 'id': id, 'name': name},
    );
    return _ok(res);
  }

  /// Delete a sub-channel.
  Future<bool> delete(String chatUUID, int id) async {
    final res = await _dio.delete(
      '/chat/sub/delete',
      data: {'chatUUID': chatUUID, 'id': id},
    );
    return _ok(res);
  }
}

// message

class MessageModule {
  final Dio _dio;
  final MessagePinModule pin;
  final MessageReactionModule reaction;

  MessageModule(this._dio)
    : pin = MessagePinModule(_dio),
      reaction = MessageReactionModule(_dio);

  /// Retrieve a specific message.
  Future<({bool success, Map<String, dynamic>? message})> retrieve(
    String chatUUID,
    int subID,
    String messageID,
  ) async {
    final res = await _dio.get(
      '/message',
      queryParameters: {
        'chatUUID': chatUUID,
        'subID': subID,
        'messageID': messageID,
      },
    );
    if (_ok(res)) {
      return (success: true, message: Map<String, dynamic>.from(_data(res)));
    }
    return (success: false, message: null);
  }

  /// Send a message to a chat.
  Future<({bool success, Map<String, dynamic>? message})> send(
    String chatUUID, {
    int subID = 0,
    String? content,
    String type = 'message',
    List<Map<String, dynamic>>? files,
    List<dynamic>? replyTos,
  }) async {
    final res = await _dio.post(
      '/message',
      data: {
        'chatUUID': chatUUID,
        'subID': subID,
        if (content != null) 'content': content,
        'type': type,
        if (files != null) 'files': files,
        if (replyTos != null) 'replyTos': replyTos,
      },
    );
    if (_ok(res)) {
      return (success: true, message: Map<String, dynamic>.from(_data(res)));
    }
    return (success: false, message: null);
  }

  /// Confirm a message.
  Future<({bool success, Map<String, dynamic>? message})> confirm(
    String messageUUID,
  ) async {
    final res = await _dio.post(
      '/message/confirm',
      data: {'messageUUID': messageUUID},
    );
    return (
      success: _ok(res),
      message: _ok(res) ? Map<String, dynamic>.from(_data(res)) : null,
    );
  }

  /// Delete a message.
  Future<({bool success, int? chatEventID})> delete(
    String chatUUID,
    int subID,
    String messageID,
  ) async {
    final res = await _dio.delete(
      '/message',
      data: {'chatUUID': chatUUID, 'subID': subID, 'messageID': messageID},
    );
    if (_ok(res)) {
      return (success: true, chatEventID: _data(res)?['chatEventID'] as int?);
    }
    return (success: false, chatEventID: null);
  }

  /// Edit a message.
  Future<({bool success, int? chatEventID})> edit(
    String chatUUID,
    int subID,
    String messageID,
    String content,
  ) async {
    final res = await _dio.patch(
      '/message',
      data: {
        'chatUUID': chatUUID,
        'subID': subID,
        'messageID': messageID,
        'content': content,
      },
    );
    if (_ok(res)) {
      return (success: true, chatEventID: _data(res)?['chatEventID'] as int?);
    }
    return (success: false, chatEventID: null);
  }

  /// Mark a message as read.
  Future<({bool success, int? chatEventID, String? userUUID, String? readAt})>
  read(String chatUUID, int subID, String messageID) async {
    final res = await _dio.post(
      '/message/read',
      data: {'chatUUID': chatUUID, 'subID': subID, 'messageID': messageID},
    );
    if (_ok(res)) {
      final d = _data(res);
      return (
        success: true,
        chatEventID: d['chatEventID'] as int?,
        userUUID: d['userUUID'] as String?,
        readAt: d['readAt'] as String?,
      );
    }
    return (success: false, chatEventID: null, userUUID: null, readAt: null);
  }
}

class MessagePinModule {
  final Dio _dio;
  MessagePinModule(this._dio);

  /// Pin a message.
  Future<({bool success, String? pinnedAt, int? chatEventID})> add(
    String chatUUID,
    int subID,
    String messageID,
  ) async {
    final res = await _dio.put(
      '/message/pin',
      data: {'chatUUID': chatUUID, 'subID': subID, 'messageID': messageID},
    );
    if (_ok(res)) {
      final d = _data(res);
      return (
        success: true,
        pinnedAt: d['pinnedAt'] as String?,
        chatEventID: d['chatEventID'] as int?,
      );
    }
    return (success: false, pinnedAt: null, chatEventID: null);
  }

  /// Unpin a message.
  Future<({bool success, int? chatEventID})> remove(
    String chatUUID,
    int subID,
    String messageID,
  ) async {
    final res = await _dio.delete(
      '/message/pin',
      data: {'chatUUID': chatUUID, 'subID': subID, 'messageID': messageID},
    );
    if (_ok(res)) {
      return (success: true, chatEventID: _data(res)?['chatEventID'] as int?);
    }
    return (success: false, chatEventID: null);
  }
}

class MessageReactionModule {
  final Dio _dio;
  MessageReactionModule(this._dio);

  /// Add a reaction to a message.
  Future<({bool success, String? reactedAt, int? chatEventID})> add(
    String chatUUID,
    int subID,
    String messageID,
    String reaction,
  ) async {
    final res = await _dio.put(
      '/message/reaction',
      data: {
        'chatUUID': chatUUID,
        'subID': subID,
        'messageID': messageID,
        'reaction': reaction,
      },
    );
    if (_ok(res)) {
      final d = _data(res);
      return (
        success: true,
        reactedAt: d['reactedAt'] as String?,
        chatEventID: d['chatEventID'] as int?,
      );
    }
    return (success: false, reactedAt: null, chatEventID: null);
  }

  /// Remove a reaction from a message.
  Future<({bool success, int? chatEventID})> remove(
    String chatUUID,
    int subID,
    String messageID,
    String reaction,
  ) async {
    final res = await _dio.delete(
      '/message/reaction',
      data: {
        'chatUUID': chatUUID,
        'subID': subID,
        'messageID': messageID,
        'reaction': reaction,
      },
    );
    if (_ok(res)) {
      return (success: true, chatEventID: _data(res)?['chatEventID'] as int?);
    }
    return (success: false, chatEventID: null);
  }
}

// file

class FileModule {
  final Dio _dio;
  FileModule(this._dio);

  /// Retrieve a file download URL and metadata.
  Future<
    ({
      bool success,
      String? downloadURL,
      String? expiresAt,
      String? name,
      int? size,
      String? mimeType,
    })
  >
  retrieve(String fileUUID) async {
    final res = await _dio.get(
      '/file',
      queryParameters: {'fileUUID': fileUUID},
    );
    if (_ok(res)) {
      final d = _data(res);
      return (
        success: true,
        downloadURL: d['downloadURL'] as String?,
        expiresAt: d['expiresAt'] as String?,
        name: d['name'] as String?,
        size: d['size'] as int?,
        mimeType: d['mimeType'] as String?,
      );
    }
    return (
      success: false,
      downloadURL: null,
      expiresAt: null,
      name: null,
      size: null,
      mimeType: null,
    );
  }

  /// Delete a file upload (cancel upload).
  Future<bool> delete(String fileUUID) async {
    final res = await _dio.delete(
      '/file',
      queryParameters: {'fileUUID': fileUUID},
    );
    return _ok(res);
  }
}

// comms

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
    if (_ok(res)) {
      final d = _data(res);
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

  /// Get room info and participants.
  Future<({bool success, dynamic room, dynamic participants})> get(
    String chatUUID, {
    int sub = 0,
  }) async {
    try {
      final res = await _dio.get(
        '/comms/room',
        queryParameters: {'chatUUID': chatUUID, 'sub': sub},
      );
      if (_ok(res)) {
        final d = _data(res);
        return (
          success: true,
          room: d['room'],
          participants: d['participants'],
        );
      }
      return (success: false, room: null, participants: null);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return (success: true, room: [], participants: []);
      }
      rethrow;
    }
  }
}

// watchTogether

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

// notification

class NotificationModule {
  final Dio _dio;
  NotificationModule(this._dio);

  /// Set the FCM push token for the current user.
  Future<bool> setFCMToken(String token) async {
    final res = await _dio.patch(
      '/notification/push-token',
      data: {'pushToken': token},
    );
    return _ok(res);
  }
}
