import 'dart:async';
import 'dart:convert';

import 'package:centrifuge/centrifuge.dart' as centrifuge;
import 'package:flutter/foundation.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';

/// The `chat:<chatUUID>:<subID>` channel of a voice room.
///
/// It carries the `activity:*` events the gateway publishes, and it is
/// subscribed only by the participants of the room: nothing here reaches a chat
/// member who is not in the call.
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
  bool _rebinding = false;
  bool _subscribing = false;
  Timer? _watchdog;

  /// Name of the channel the room listens on.
  String get name => 'chat:$chatUUID:$subID';

  /// How often the watchdog checks that the subscription is still on the live
  /// connection: a replaced client stops delivering without an error.
  static const Duration watchdogInterval = Duration(seconds: 5);

  /// Binds the channel, resubscribing when the connection was replaced.
  ///
  /// [resync] forces a snapshot even when the subscription is already in
  /// place, which is what an app resumed from the background needs.
  Future<void> subscribe({bool resync = false}) async {
    if (_disposed) return;

    _watchdog ??= Timer.periodic(
      watchdogInterval,
      (_) => unawaited(_ensureBound()),
    );

    final current = client();
    if (current == null) {
      debugPrint('Activity channel $name: the connection is down');
      return;
    }

    final alive =
        _subscription?.state == centrifuge.SubscriptionState.subscribed;

    if (identical(current, _bound) && _subscription != null && alive) {
      if (resync) await onResynced();
      return;
    }

    final rebound = _subscription != null;

    await _unbind();

    _bound = current;

    final subscription =
        current.getSubscription(name) ?? current.newSubscription(name);
    _subscription = subscription;

    _listeners.add(
      subscription.publication.listen(
        _onPublication,
        onError: (Object error) =>
            debugPrint('Activity channel $name error: $error'),
      ),
    );

    _subscribing = true;

    try {
      await subscription.subscribe();
    } catch (error) {
      debugPrint('Activity channel $name: subscribe failed: $error');

      // Only the attempt that still owns the field may unbind: the watchdog
      // may have replaced it while this one was failing.
      if (identical(_subscription, subscription)) await _unbind();

      return;
    } finally {
      _subscribing = false;
    }

    if (rebound || resync) await onResynced();
  }

  /// Rebinds the subscription when the connection was replaced or the
  /// subscription died.
  ///
  /// The app discards its realtime client on every reconnect: a channel left on
  /// the old one stops receiving without an error, which is why the state of an
  /// activity froze until the room was joined again.
  Future<void> _ensureBound() async {
    if (_disposed || _rebinding || _subscribing) return;

    final current = client();
    if (current == null) return;

    if (identical(current, _bound) &&
        _subscription?.state == centrifuge.SubscriptionState.subscribed) {
      return;
    }

    _rebinding = true;

    try {
      await subscribe(resync: !identical(current, _bound));
    } finally {
      _rebinding = false;
    }
  }

  /// Leaves the channel. The connection itself stays untouched.
  Future<void> dispose() async {
    _disposed = true;
    _watchdog?.cancel();
    _watchdog = null;
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
    final owner = _bound ?? client();
    _subscription = null;
    _bound = null;

    if (subscription == null) return;

    try {
      await subscription.unsubscribe();
    } catch (error) {
      debugPrint('Activity channel $name: unsubscribe failed: $error');

      if (owner != null) {
        try {
          await owner.removeSubscription(subscription);
        } catch (_) {}
      }
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
