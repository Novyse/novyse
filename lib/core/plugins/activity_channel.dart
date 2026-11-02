import 'dart:async';
import 'dart:convert';

import 'package:centrifuge/centrifuge.dart' as centrifuge;
import 'package:flutter/foundation.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';

/// The `chat:<chatUUID>:<subID>` channel of a voice room.
///
/// It carries the `activity:*` events the gateway publishes and the
/// `activity:action` events the participants publish, and it is subscribed
/// only by the participants of the room: nothing here reaches a chat member
/// who is not in the call.
///
/// The connection is read lazily and rebound when it is replaced: the app
/// discards its client on every reconnect, and a channel bound to the old one
/// would silently stop receiving.
class ActivityChannel {
  ActivityChannel({
    required this.chatUUID,
    required this.subID,
    required this.client,
    required this.onEvent,
    required this.onResynced,
  });

  final String chatUUID;
  final int subID;

  /// The current realtime connection, `null` while it is down.
  final centrifuge.Client? Function() client;

  /// Receives every `activity:*` publication of the room.
  final void Function(String event, Map<String, dynamic> payload) onEvent;

  /// Called after a (re)subscribe: the caller takes a fresh snapshot, because
  /// the events published while the connection was down are not replayed.
  final Future<void> Function() onResynced;

  final List<StreamSubscription<dynamic>> _listeners = [];

  centrifuge.Subscription? _subscription;
  centrifuge.Client? _bound;
  bool _disposed = false;

  /// Name of the channel the room listens on.
  String get name => 'chat:$chatUUID:$subID';

  /// True when the channel is bound to the live connection.
  bool get isBound => _subscription != null && identical(_bound, client());

  /// Binds the channel, resubscribing when the connection was replaced.
  ///
  /// [resync] forces a snapshot even when the subscription is already in
  /// place, which is what an app resumed from the background needs.
  Future<void> subscribe({bool resync = false}) async {
    if (_disposed) return;

    final current = client();
    if (current == null) {
      debugPrint('Activity channel $name: the connection is down');
      return;
    }

    if (identical(current, _bound) && _subscription != null) {
      if (resync) await onResynced();
      return;
    }

    final rebound = _subscription != null;

    await _unbind();

    _bound = current;

    final subscription = current.newSubscription(name);
    _subscription = subscription;

    _listeners.add(
      subscription.publication.listen(
        _onPublication,
        onError: (Object error) =>
            debugPrint('Activity channel $name error: $error'),
      ),
    );

    try {
      await subscription.subscribe();
    } catch (error) {
      debugPrint('Activity channel $name: subscribe failed: $error');
      return;
    }

    if (rebound || resync) await onResynced();
  }

  /// Publishes an `activity:action` on the room channel.
  ///
  /// Transient by design: it reaches whoever is in the room now and is never
  /// replayed, so a late joiner cannot rebuild anything from it.
  ///
  /// Returns false when the channel is not usable: the caller decides whether
  /// to surface that or to let the next attempt re-apply the state.
  Future<bool> publishAction({
    required String instanceId,
    required String type,
    Object? data,
  }) async {
    final current = client();
    if (current == null || _subscription == null) return false;

    try {
      await current.publish(
        name,
        utf8.encode(
          jsonEncode({
            'event': 'activity:action',
            'payload': {'instanceId': instanceId, 'type': type, 'data': ?data},
          }),
        ),
      );
      return true;
    } catch (error) {
      debugPrint('Activity channel $name: publish failed: $error');
      return false;
    }
  }

  /// Leaves the channel. The connection itself stays untouched.
  Future<void> dispose() async {
    _disposed = true;
    await _unbind();
  }

  Future<void> _unbind() async {
    for (final listener in _listeners) {
      try {
        await listener.cancel();
      } catch (_) {}
    }
    _listeners.clear();

    final subscription = _subscription;
    _subscription = null;
    _bound = null;

    if (subscription == null) return;

    try {
      await subscription.unsubscribe();
    } catch (error) {
      debugPrint('Activity channel $name: unsubscribe failed: $error');
    }
  }

  void _onPublication(centrifuge.PublicationEvent event) {
    if (_disposed) return;

    final envelope = BridgeProtocol.decodeMap(utf8.decode(event.data));
    if (envelope == null) return;

    final name = envelope['event']?.toString();
    if (name == null || !name.startsWith('activity:')) return;

    final payload = envelope['payload'];

    onEvent(
      name,
      payload is Map ? Map<String, dynamic>.from(payload) : const {},
    );
  }
}
