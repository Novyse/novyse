import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/services/api_gateway.dart';

/// Chat-facing operations used by the UI.
class ChatService {
  const ChatService(this._gateway);

  final Gateway _gateway;

  /// Availability of a handle, used while creating a chat.
  Future<({bool success, bool? available})> checkHandle(String handle) {
    return _gateway.check.handle(handle);
  }

  /// Creates a chat and returns the server envelope.
  Future<Map<String, dynamic>> create({
    required String type,
    String? name,
    String? handle,
    List<String> memberUUIDs = const [],
  }) {
    return _gateway.chat.create(
      type,
      memberUUIDs: memberUUIDs,
      name: name,
      handle: handle,
    );
  }

  /// Joins an existing chat by handle.
  Future<Map<String, dynamic>> join(String handle) =>
      _gateway.chat.join(handle);

  /// Creates a sub channel inside a forum.
  Future<({bool success, Map<String, dynamic>? sub})> createSub({
    required String chatUUID,
    required String name,
    required String type,
  }) {
    return _gateway.chat.sub.create(chatUUID, name, type);
  }
}

/// Riverpod provider for [ChatService].
final chatServiceProvider = Provider<ChatService>(
  (ref) => ChatService(apiGateway),
);
