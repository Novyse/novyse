import 'dart:async' show unawaited;

import 'package:flutter/foundation.dart' show debugPrint;

/// Resolves the publication target for a chat channel. Provided by the
/// connection manager, which owns the `chat:<uuid>` subscriptions.
typedef ChatPublisher =
    Future<void> Function(String chatUUID, Map<String, dynamic> data);

/// Handles sending events from the app to the realtime server.
/// Equivalent to `eventSender` in the TypeScript codebase.
class EventSender {
  EventSender._();
  static final EventSender instance = EventSender._();

  ChatPublisher? _publisher;

  void initialize(ChatPublisher publisher) {
    _publisher = publisher;
  }

  void reset() {
    _publisher = null;
  }

  /// Send a typing/recording activity indicator by publishing on the
  /// `chat:<chatUUID>` channel. The server validates the chat, rewrites
  /// `userUUID` with the authenticated identity and rate limits per
  /// connection (error 111 `too many requests` on excess).
  void activity(String chatUUID, String action) {
    final publisher = _publisher;
    if (publisher == null) {
      debugPrint('Cannot send activity: not initialized');
      return;
    }
    unawaited(
      // Fall through on publish errors: activity indicators are best effort.
      publisher(chatUUID, {'chatUUID': chatUUID, 'action': action})
          .catchError((Object error) {
        debugPrint('Activity publish failed for $chatUUID: $error');
      }),
    );
  }
}

final eventSender = EventSender.instance;
