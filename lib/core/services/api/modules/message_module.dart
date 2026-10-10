import 'package:dio/dio.dart';

import '../api_response.dart';

// Message, pin, reaction and favorite endpoints.

class MessageModule {
  final Dio _dio;
  final MessagePinModule pin;
  final MessageReactionModule reaction;
  final MessageFavoriteModule favorite;

  MessageModule(this._dio)
    : pin = MessagePinModule(_dio),
      reaction = MessageReactionModule(_dio),
      favorite = MessageFavoriteModule(_dio);

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
    if (isOk(res)) {
      return (
        success: true,
        message: Map<String, dynamic>.from(responseData(res)),
      );
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
        'content': ?content,
        'type': type,
        'files': ?files,
        'replyTos': ?replyTos,
      },
    );
    if (isOk(res)) {
      return (
        success: true,
        message: Map<String, dynamic>.from(responseData(res)),
      );
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
      success: isOk(res),
      message: isOk(res) ? Map<String, dynamic>.from(responseData(res)) : null,
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
    if (isOk(res)) {
      return (
        success: true,
        chatEventID: responseData(res)?['chatEventID'] as int?,
      );
    }
    return (success: false, chatEventID: null);
  }

  /// Edit a message. Returns upload URLs when new files are being added.
  Future<({bool success, int? chatEventID, Map<String, dynamic>? data})> edit(
    String chatUUID,
    int subID,
    String messageID,
    String? content, {
    List<Map<String, dynamic>>? files,
  }) async {
    final res = await _dio.patch(
      '/message',
      data: {
        'chatUUID': chatUUID,
        'subID': subID,
        'messageID': messageID,
        'content': content,
        'files': ?files,
      },
    );
    if (isOk(res)) {
      final d = responseData(res);
      return (
        success: true,
        chatEventID: d?['chatEventID'] as int?,
        data: d is Map ? Map<String, dynamic>.from(d) : null,
      );
    }
    return (success: false, chatEventID: null, data: null);
  }

  /// Confirm a message edit after files have been uploaded.
  Future<({bool success, int? chatEventID, Map<String, dynamic>? data})>
  editConfirm(String messageUUID) async {
    final res = await _dio.post(
      '/message/edit/confirm',
      data: {'messageUUID': messageUUID},
    );
    if (isOk(res)) {
      final d = responseData(res);
      return (
        success: true,
        chatEventID: d?['chatEventID'] as int?,
        data: d is Map ? Map<String, dynamic>.from(d) : null,
      );
    }
    return (success: false, chatEventID: null, data: null);
  }

  /// Mark a message as read.
  Future<({bool success, int? chatEventID, String? userUUID, String? readAt})>
  read(String chatUUID, int subID, String messageID) async {
    final res = await _dio.post(
      '/message/read',
      data: {'chatUUID': chatUUID, 'subID': subID, 'messageID': messageID},
    );
    if (isOk(res)) {
      final d = responseData(res);
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
    if (isOk(res)) {
      final d = responseData(res);
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
    if (isOk(res)) {
      return (
        success: true,
        chatEventID: responseData(res)?['chatEventID'] as int?,
      );
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
    if (isOk(res)) {
      final d = responseData(res);
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
    if (isOk(res)) {
      return (
        success: true,
        chatEventID: responseData(res)?['chatEventID'] as int?,
      );
    }
    return (success: false, chatEventID: null);
  }
}

class MessageFavoriteModule {
  final Dio _dio;
  MessageFavoriteModule(this._dio);

  /// Add a message to favorites.
  Future<({bool success, String? createdAt, int? userEventID})> add(
    String chatUUID,
    int subID,
    dynamic messageID,
  ) async {
    final res = await _dio.put(
      '/message/favorite',
      data: {'chatUUID': chatUUID, 'subID': subID, 'messageID': messageID},
    );
    if (isOk(res)) {
      final d = responseData(res);
      return (
        success: true,
        createdAt: d['createdAt'] as String?,
        userEventID: d['userEventID'] as int?,
      );
    }
    return (success: false, createdAt: null, userEventID: null);
  }

  /// Remove a message from favorites.
  Future<({bool success, int? userEventID})> remove(
    String chatUUID,
    int subID,
    dynamic messageID,
  ) async {
    final res = await _dio.delete(
      '/message/favorite',
      data: {'chatUUID': chatUUID, 'subID': subID, 'messageID': messageID},
    );
    if (isOk(res)) {
      return (
        success: true,
        userEventID: responseData(res)?['userEventID'] as int?,
      );
    }
    return (success: false, userEventID: null);
  }
}
