import 'package:flutter/foundation.dart' show debugPrint;
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:novyse/core/events/global_event_emitter.dart';

/// Handles receiving events from the Socket.IO server and passing them
/// to the [GlobalEventEmitter].
/// Equivalent to `eventReceiver` in the TypeScript codebase.
class EventReceiver {
  EventReceiver._();
  static final EventReceiver instance = EventReceiver._();

  io.Socket? _activeSocket;

  void initialize(io.Socket sock, GlobalEventEmitter emitter) {
    if (_activeSocket == sock) {
      debugPrint('eventReceiver already initialized for this socket, skipping');
      return;
    }
    _activeSocket = sock;
    final socket = sock;

    socket.on('user:profile:update', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        await emitter.user.profile.update(data, data['profileEventID'] as int?);
      }
    });

    socket.on('user:setting:chat:update', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final chatUUID = data['chatUUID'] as String?;
        final action = data['action'] as String?;
        if (chatUUID != null && action != null) {
          await emitter.user.setting.chat.update(
            chatUUID,
            action,
            data['userEventID'] as int?,
            data,
          );
        }
      }
    });

    socket.on('user:presence:online', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final userUUID = data['userUUID'] as String?;
        if (userUUID != null) {
          await emitter.user.presence.update(userUUID, 'ONLINE');
        }
      }
    });

    socket.on('user:presence:offline', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final userUUID = data['userUUID'] as String?;
        if (userUUID != null) {
          await emitter.user.presence.update(
            userUUID,
            'OFFLINE',
            data['lastAccessAt'] as String?,
          );
        }
      }
    });

    socket.on('message:new', (raw) async {
      if (raw is Map) {
        final message = Map<String, dynamic>.from(raw);
        await emitter.message.add(message);
      }
    });

    socket.on('message:read', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final chatUUID = data['chatUUID'] as String?;
        final subID = data['subID'] as int?;
        final messageID = data['messageID'] as String?;
        if (chatUUID != null && subID != null && messageID != null) {
          await emitter.message.update(
            chatUUID,
            subID,
            messageID,
            'read',
            data['chatEventID'] as int?,
            {'userUUID': data['userUUID'], 'readAt': data['readAt']},
          );
        }
      }
    });

    socket.on('message:update', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final chatUUID = data['chatUUID'] as String?;
        final subID = data['subID'] as int?;
        final messageID = data['messageID'] as String?;
        final action = data['action'] as String?;
        if (chatUUID != null && subID != null && messageID != null && action != null) {
          await emitter.message.update(
            chatUUID,
            subID,
            messageID,
            action,
            data['chatEventID'] as int?,
            data,
          );
        }
      }
    });

    socket.on('chat:new', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final chatRaw = data['chat'];
        final usersRaw = data['users'];
        if (chatRaw is Map && usersRaw is List) {
          await emitter.chat.add(
            Map<String, dynamic>.from(chatRaw),
            usersRaw,
          );
        }
      }
    });

    socket.on('chat:update', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final chatUUID = data['chatUUID'] as String?;
        final action = data['action'] as String?;
        if (chatUUID != null && action != null) {
          await emitter.chat.update(
            chatUUID,
            action,
            data['chatEventID'] as int?,
            data,
          );
        }
      }
    });

    socket.on('chat:member:joined', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final chatRaw = data['chat'];
        final userRaw = data['user'];
        if (chatRaw is Map && userRaw is Map) {
          final chatUUID = chatRaw['uuid'] as String?;
          if (chatUUID != null) {
            await emitter.chat.member.join(
              chatUUID,
              Map<String, dynamic>.from(userRaw),
              data['chatEventID'] as int?,
            );
          }
        }
      }
    });

    socket.on('chat:member:activity', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final chatUUID = data['chatUUID'] as String?;
        final userUUID = data['userUUID'] as String?;
        final action = data['action'] as String?;
        if (chatUUID != null && userUUID != null && action != null) {
          await emitter.chat.member.activity(
            chatUUID,
            userUUID,
            action,
          );
        }
      }
    });

    socket.on('chat:member:left', (raw) async {
      if (raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final chatUUID = data['chatUUID'] as String?;
        final userRaw = data['user'];
        if (chatUUID != null && userRaw is Map) {
          await emitter.chat.member.leave(
            chatUUID,
            Map<String, dynamic>.from(userRaw),
          );
        }
      }
    });
  }
}

final eventReceiver = EventReceiver.instance;
