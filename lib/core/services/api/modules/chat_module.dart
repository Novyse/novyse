import 'package:dio/dio.dart';

import '../api_response.dart';

// Chat, chat picture, pin and sub endpoints.

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
        'name': ?name,
        if (handle != null && handle.isNotEmpty) 'handle': handle,
      },
    );
    if (isOk(res)) {
      final d = responseData(res);
      return {'success': true, 'chat': d['chat'], 'users': d['users']};
    }
    return {'success': false};
  }

  /// Join a chat by its handle.
  Future<Map<String, dynamic>> join(String handle) async {
    assert(handle.isNotEmpty, 'Handle is required to join a chat');
    final res = await _dio.post('/chat/join', data: {'handle': handle});
    if (isOk(res)) {
      final d = responseData(res);
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
    if (isOk(res)) {
      final d = responseData(res);
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

  /// Confirm a chat picture upload.
  Future<({bool success, String? pictureUUID, int? chatEventID})> confirm(
    String chatUUID,
    String fileUUID,
  ) async {
    final res = await _dio.post(
      '/chat/picture/confirm',
      data: {'chatUUID': chatUUID, 'fileUUID': fileUUID},
    );
    if (isOk(res)) {
      final d = responseData(res);
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
    final d = responseData(res);
    return (
      success: isOk(res),
      position: d?['position'] as int?,
      userEventID: d?['userEventID'] as int?,
    );
  }

  /// Unpin a chat.
  Future<({bool success, int? userEventID})> remove(String chatUUID) async {
    final res = await _dio.delete('/chat/pin', data: {'chatUUID': chatUUID});
    if (isOk(res)) {
      return (
        success: true,
        userEventID: responseData(res)?['userEventID'] as int?,
      );
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
    if (isOk(res)) {
      return (success: true, sub: Map<String, dynamic>.from(responseData(res)));
    }
    return (success: false, sub: null);
  }

  /// Rename a sub-channel.
  Future<bool> rename(String chatUUID, int id, String name) async {
    final res = await _dio.patch(
      '/chat/sub/rename',
      data: {'chatUUID': chatUUID, 'id': id, 'name': name},
    );
    return isOk(res);
  }

  /// Delete a sub-channel.
  Future<bool> delete(String chatUUID, int id) async {
    final res = await _dio.delete(
      '/chat/sub/delete',
      data: {'chatUUID': chatUUID, 'id': id},
    );
    return isOk(res);
  }
}
