import 'dart:async';

import 'package:centrifuge/centrifuge.dart' as centrifuge;
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/services/auth.dart';
import 'package:novyse/core/services/realtime/chat_publish.dart';
import 'package:novyse/core/services/realtime/connection.dart';
import 'package:novyse/core/services/realtime/connection_events.dart';
import 'package:novyse/core/services/realtime/event_receiver.dart';
import 'package:novyse/core/services/realtime/event_sender.dart';
import 'package:novyse/core/services/realtime/reconnect.dart';
import 'package:novyse/core/services/realtime/teardown.dart';
import 'package:novyse/core/stores/network_store.dart';
import 'package:novyse/core/stores/status_store.dart';

/// Manages the realtime connection lifecycle and wires the realtime layer
/// pieces together. The entry owns the transport state (the live client and
/// its listeners) and the open/close/send interface; everything else lives
/// in its own module:
///
/// - the connection is built by `connectRealtime` and its streams are
///   plumbed by `bindClientEvents` (`connection.dart`);
/// - what a connection opening or a server disconnect means on this side
///   of the connection belongs to `connection_events.dart` (`ConnectionEvents`);
/// - inbound publications are unwrapped and dispatched by the receiver
///   (`EventReceiver.handlePublication`), outgoing events are published on
///   the chat namespace by `publishOnChat` (`event_sender.dart` +
///   `chat_publish.dart`);
/// - the reconnects the client starts itself are scheduled by
///   `connection_events.dart`'s `classifyDisconnect` and
///   `ReconnectScheduler` (`reconnect.dart`);
/// - a discarded client is torn down by `teardownClient` (`teardown.dart`).
class SocketService {
  final Ref _ref;

  late final ReconnectScheduler _reconnects;

  late final ConnectionEvents _events;

  centrifuge.Client? _client;

  /// Listener subscriptions of [_client], cancelled when it is discarded.
  final List<StreamSubscription<dynamic>> _clientListeners = [];

  bool _isConnecting = false;

  SocketService(this._ref) {
    _reconnects = ReconnectScheduler(
      onOpen: open,
      onSessionInvalid: () => emitSessionInvalid(_ref),
    );
    _events = ConnectionEvents(
      ref: _ref,
      reconnects: _reconnects,
      publisher: (chatUUID, data) => publishOnChat(_client, chatUUID, data),
      discardClient: _discardClient,
    );

    // Auto connect/disconnect when network state changes
    _ref.listen(networkProvider, (previous, next) {
      if (next.isConnected && next.isSynced) {
        if (!isOpen) {
          debugPrint('Network state → online+synced. Opening connection...');
          open();
        }
      } else {
        if (_client != null) {
          debugPrint(
            'Network state → offline/unsynced. Closing connection...',
          );
          close();
        }
      }
    });
  }

  bool get isOpen => _client?.state == centrifuge.State.connected;

  /// Opens the realtime connection.
  Future<void> open({bool forceRefreshToken = false}) async {
    try {
      final networkState = _ref.read(networkProvider);
      if (!networkState.isConnected || !networkState.isSynced) {
        debugPrint('Cannot open connection: Network offline or not synced');
        return;
      }

      if (_isConnecting || isOpen) {
        debugPrint(
          'Connection already in progress or already connected',
        );
        return;
      }

      _isConnecting = true;
      _reconnects.beforeOpening();

      final accessToken = await auth.token.get(forceRefresh: forceRefreshToken);

      if (accessToken == null) {
        // No token available even after a (forced) refresh: the session is
        // invalid. Surface it instead of retrying forever.
        debugPrint('Open aborted: no access token available');
        _isConnecting = false;
        emitSessionInvalid(_ref);
        return;
      }

      // Discard any previous instance and its listeners.
      _discardClient();
      _isConnecting = true;

      final client = connectRealtime(accessToken: accessToken);
      _client = client;

      bool isCurrent() => identical(client, _client);

      _clientListeners.addAll(
        bindClientEvents(
          client,
          isCurrent: isCurrent,
          onConnected: () {
            _isConnecting = false;
            _events.connected();
          },
          onDisconnected: (event) {
            _isConnecting = false;
            _events.disconnected(event);
          },
          onPublication: eventReceiver.handlePublication,
          onError: (error) => debugPrint('Realtime error: $error'),
        ),
      );

      unawaited(client.connect());
    } catch (error) {
      debugPrint('Realtime initialization error: $error');
      _isConnecting = false;
    }
  }

  void close() {
    _reconnects.reset();
    if (_client != null) {
      debugPrint('Closing realtime connection');
    }
    _discardClient();
    _ref.read(statusProvider.notifier).setSocketStatus(isConnected: false);
  }

  /// Exposes the event sender for sending messages.
  EventSender? send() {
    if (!isOpen) {
      debugPrint('Cannot send message: Not connected');
      return null;
    }
    return eventSender;
  }

  /// Forgets the current connection and tears it down: the next create +
  /// wire pairing starts from a clean state.
  void _discardClient() {
    final client = _client;
    _client = null;
    _isConnecting = false;
    teardownClient(client, _clientListeners);
  }
}

/// Riverpod provider for the [SocketService].
final socketServiceProvider = Provider<SocketService>((ref) {
  return SocketService(ref);
});
