import 'package:centrifuge/centrifuge.dart' as centrifuge;
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/services/realtime/disconnect.dart';
import 'package:novyse/core/services/realtime/event_receiver.dart';
import 'package:novyse/core/services/realtime/event_sender.dart';
import 'package:novyse/core/services/realtime/reconnect.dart';
import 'package:novyse/core/stores/network_store.dart';
import 'package:novyse/core/stores/status_store.dart';
import 'package:novyse/core/stores/user_store.dart';

/// Reactions of this app to the realtime connection lifecycle: what the
/// connection events mean on this side of the connection.
///
/// - connected: the socket goes online, the receiver starts working on the
///   identity of the stored local user, and the sender publishes through
///   the connection manager's publisher;
/// - disconnected: the socket status follows, and the reaction depends on
///   the disconnect code ([classifyDisconnect]): an invalid session routes
///   the user back to sign in, an invalid access token discards the client
///   and reconnects with a fresh one, a drained node reconnects on its
///   own.
///
/// The connecting state of the owning service is not a reaction: the
/// caller keeps the flag in step around these two.
final class ConnectionEvents {
  ConnectionEvents({
    required this.ref,
    required this.reconnects,
    required this.publisher,
    required this.discardClient,
  });

  final Ref ref;

  /// Budget keeper of the client-run reconnects.
  final ReconnectScheduler reconnects;

  /// Wires the sender to the chat publishing of the live connection.
  final ChatPublisher publisher;

  /// Tears the live client down, called when the client must go (fresh
  /// token reconnect).
  final void Function() discardClient;

  /// Activates the layer for the connection that just opened.
  void connected() {
    debugPrint('Realtime connection opened!');
    reconnects.reset();
    ref.read(statusProvider.notifier).setSocketStatus(isConnected: true);

    eventReceiver.initialize(ref.read(globalEventEmitterProvider));
    // The self-echo filters key on the identity of the app's stored user.
    eventReceiver.identify(
      userUUID: ref.read(userStoreProvider).localUserUUID,
    );
    eventSender.initialize(publisher);
  }

  /// Classifies a server disconnect into its reaction.
  void disconnected(centrifuge.DisconnectedEvent event) {
    debugPrint(
      'Realtime disconnected: ${event.code} — ${event.reason}',
    );
    final isOnline = ref.read(networkProvider).isConnected;
    if (isOnline) {
      ref
          .read(statusProvider.notifier)
          .setSocketStatus(isConnected: false, isConnecting: false);
    }

    switch (classifyDisconnect(event.code)) {
      case DisconnectReaction.signInAgain:
        // The session was revoked elsewhere, or a refresh carried the
        // identity of another session: clear the token, go back to sign
        // in, don't reconnect.
        debugPrint('Session invalidated by the server (${event.code})');
        reconnects.reset();
        emitSessionInvalid(ref);
        break;

      case DisconnectReaction.reconnectWithFreshToken:
        // Token malformed or signed by the wrong key: obtain a fresh one
        // and reconnect with backoff.
        discardClient();
        reconnects.afterAuthFailure('AUTH_INVALID_TOKEN');
        break;

      case DisconnectReaction.reconnectAfterShutdown:
        // The SDK stops instead of reconnecting on this code: the client
        // reconnects itself with backoff.
        reconnects.afterServerShutdown();
        break;

      case DisconnectReaction.sdkHandles:
        // Temporary code: the SDK reconnects automatically with its own
        // backoff and asks `getToken` for a fresh access token when needed.
        break;
    }
  }
}
