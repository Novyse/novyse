import 'dart:async' show unawaited;
import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/settings/settings_catalog.dart';

/// Handles receiving events from the realtime server and passing them
/// to the [GlobalEventEmitter].
///
/// Publications land on the top-level connection stream, whatever channel
/// they come from: [handlePublication] is the single entry point the
/// connection feeds, and it unwraps the `{event, payload}` envelope of the
/// publication data before [handleEvent] takes over. The server delivers
/// every event once per connection and withholds the ones addressed to
/// another session, so nothing is filtered on arrival: what runs here are
/// the checks about the events the connection produces itself:
///
/// - the self-echo filter: a `chat:member:activity` publish comes back on
///   the channel of its own sender and is ignored;
/// - the self-presence filter: own `user:presence:*` transitions are
///   ignored.
///
/// Both compare against the user UUID of the connection, set by the
/// connection manager when the connection opens ([identify]).
class EventReceiver {
  EventReceiver._();
  static final EventReceiver instance = EventReceiver._();

  GlobalEventEmitter? _emitter;

  /// UUID of the user the connection belongs to.
  String? _myUserUUID;

  /// Binds the emitter that handles the received events. Events are dropped
  /// until called.
  void initialize(GlobalEventEmitter emitter) {
    if (identical(_emitter, emitter)) {
      debugPrint('eventReceiver already initialized, skipping');
      return;
    }
    _emitter = emitter;
  }

  /// Sets the connection identity used by the self-echo filters. The
  /// filters are inert while the identity is missing.
  void identify({String? userUUID}) {
    _myUserUUID = userUUID;
  }

  /// Handles one publication of any channel: unwraps the `{event, payload}`
  /// envelope of its [data] and dispatches.
  void handlePublication(String channel, List<int> data) {
    Map<String, dynamic>? envelope;
    try {
      final decoded = data.isEmpty ? null : jsonDecode(utf8.decode(data));
      if (decoded is Map<String, dynamic>) envelope = decoded;
    } catch (error) {
      debugPrint('Realtime publication decode error ($channel): $error');
      return;
    }
    if (envelope == null) return;

    final event = envelope['event']?.toString();
    if (event == null || event.isEmpty) return;
      handleEvent(event, envelope['payload']);
  }

  /// Handles one received [event] with its [payload].
  void handleEvent(String event, dynamic raw) {
    final emitter = _emitter;
    if (emitter == null) {
      debugPrint('eventReceiver not initialized, dropping event $event');
      return;
    }
    if (raw is! Map) {
      debugPrint('Dropping event $event with a non-map payload');
      return;
    }
    final payload = Map<String, dynamic>.from(raw);

    switch (event) {
      case 'user:profile:update':
        return unawaited(
          emitter.user.profile.update(
            payload,
            payload['profileEventID'] as int?,
          ),
        );

      case 'user:setting:chat:update':
        final chatUUID = payload['chatUUID'] as String?;
        final action = payload['action'] as String?;
        if (chatUUID != null && action != null) {
          return unawaited(
            emitter.user.setting.chat.update(
              chatUUID,
              action,
              payload['userEventID'] as int?,
              payload,
            ),
          );
        }
        return;

      case 'user:setting:update':
        final key = payload['key']?.toString();
        if (key == null || key.isEmpty) return;
        final item = SettingsCatalog.findBySettingKey(key);
        if (item == null || item.scope != SettingScope.synchronized) return;
        return unawaited(
          emitter.user.setting.value.update(key, payload['value']),
        );

      case 'user:message:favorite:update':
        final chatUUID = payload['chatUUID'] as String?;
        final subID = payload['subID'] as int?;
        final messageID = payload['messageID']?.toString();
        final action = payload['action'] as String?;
        if (chatUUID != null &&
            subID != null &&
            messageID != null &&
            action != null) {
          return unawaited(
            emitter.user.favorite.update(
              chatUUID,
              subID,
              messageID,
              action,
              payload['userEventID'] as int?,
              payload,
            ),
          );
        }
        return;

      case 'user:presence:online':
        final userUUID = payload['userUUID'] as String?;
        if (userUUID != null && userUUID != _myUserUUID) {
          return unawaited(emitter.user.presence.update(userUUID, 'ONLINE'));
        }
        return;

      case 'user:presence:offline':
        final userUUID = payload['userUUID'] as String?;
        if (userUUID != null && userUUID != _myUserUUID) {
          return unawaited(
            emitter.user.presence.update(
              userUUID,
              'OFFLINE',
              payload['lastAccessAt'] as String?,
            ),
          );
        }
        return;

      case 'message:new':
        return unawaited(emitter.message.add(payload));

      case 'message:read':
        final chatUUID = payload['chatUUID'] as String?;
        final subID = payload['subID'] as int?;
        final messageID = payload['messageID']?.toString();
        if (chatUUID != null && subID != null && messageID != null) {
          return unawaited(
            emitter.message.update(
              chatUUID,
              subID,
              messageID,
              'read',
              payload['chatEventID'] as int?,
              {'userUUID': payload['userUUID'], 'readAt': payload['readAt']},
            ),
          );
        }
        return;

      case 'message:update':
        final chatUUID = payload['chatUUID'] as String?;
        final subID = payload['subID'] as int?;
        final messageID = payload['messageID']?.toString();
        final action = payload['action'] as String?;
        if (chatUUID != null &&
            subID != null &&
            messageID != null &&
            action != null) {
          return unawaited(
            emitter.message.update(
              chatUUID,
              subID,
              messageID,
              action,
              payload['chatEventID'] as int?,
              payload,
            ),
          );
        }
        return;

      case 'chat:new':
        final chatRaw = payload['chat'];
        final usersRaw = payload['users'];
        if (chatRaw is Map && usersRaw is List) {
          return unawaited(
            emitter.chat.add(Map<String, dynamic>.from(chatRaw), usersRaw),
          );
        }
        return;

      case 'chat:update':
        final chatUUID = payload['chatUUID'] as String?;
        final action = payload['action'] as String?;
        if (chatUUID != null && action != null) {
          return unawaited(
            emitter.chat.update(
              chatUUID,
              action,
              payload['chatEventID'] as int?,
              payload,
            ),
          );
        }
        return;

      case 'chat:member:joined':
        final chatRaw = payload['chat'];
        final userRaw = payload['user'];
        if (chatRaw is Map && userRaw is Map) {
          final chatUUID = chatRaw['uuid'] as String?;
          if (chatUUID != null) {
            return unawaited(
              emitter.chat.member.join(
                chatUUID,
                Map<String, dynamic>.from(userRaw),
                payload['chatEventID'] as int?,
              ),
            );
          }
        }
        return;

      case 'chat:member:activity':
        final chatUUID = payload['chatUUID'] as String?;
        final userUUID = payload['userUUID'] as String?;
        final action = payload['action'] as String?;
        if (chatUUID != null &&
            userUUID != null &&
            action != null &&
            // The sender receives its own activity publish back: ignore it.
            userUUID != _myUserUUID) {
          return unawaited(
            emitter.chat.member.activity(chatUUID, userUUID, action),
          );
        }
        return;

      case 'chat:member:left':
        final chatUUID = payload['chatUUID'] as String?;
        final userRaw = payload['user'];
        if (chatUUID != null && userRaw is Map) {
          return unawaited(
            emitter.chat.member.leave(
              chatUUID,
              Map<String, dynamic>.from(userRaw),
            ),
          );
        }
        return;

      default:
        return;
    }
  }
}

final eventReceiver = EventReceiver.instance;
