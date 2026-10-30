/// The reconnect machinery for the disconnects the client handles itself:
/// a node draining for a deploy (`DisconnectReaction.reconnectAfterShutdown`)
/// and an access token the server does not accept
/// (`DisconnectReaction.reconnectWithFreshToken`).
///
/// Both reactions share one timer and own attempt counters, with exponential
/// backoff; an exhausted auth budget treats the session as invalid instead
/// of looping forever. Temporary disconnects stay with the SDK lifecycle.
library;

import 'dart:async';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/stores/status_store.dart';

/// Opens the connection again when a scheduled retry fires.
typedef ConnectionOpener = Future<void> Function({bool forceRefreshToken});

/// Backoff for the reconnect after the node drained: 0.5s doubling, capped
/// at 20s, kept running indefinitely like the SDK's own reconnect loop.
const _reconnectBackoffStart = Duration(milliseconds: 500);
const _reconnectBackoffMax = Duration(seconds: 20);

/// Backoff for the reconnect on an invalid-token disconnect: 1s doubling,
/// giving up after [_maxAuthRetries] consecutive failures.
const _authRetryBackoffStart = Duration(seconds: 1);
const _maxAuthRetries = 4;

/// Schedules the reconnects the client starts itself after specific
/// disconnects, with backoff.
class ReconnectScheduler {
  ReconnectScheduler({
    required this.onOpen,
    required this.onSessionInvalid,
  });

  /// Opens the connection again when a scheduled retry fires.
  final ConnectionOpener onOpen;

  /// The auth retry budget is exhausted: the session must be treated as
  /// invalid and the user routed back to sign in.
  final void Function() onSessionInvalid;

  /// Timer of the pending retry, shared by both reactions.
  Timer? _timer;

  /// Consecutive failures after an invalid-token disconnect.
  int _authFailures = 0;

  /// Reconnect attempts after a server shutdown disconnect.
  int _reconnectAttempts = 0;

  /// Whether a shutdown reconnect is scheduled (the drain of a rolling
  /// deploy can fire several disconnects before a retry lands).
  bool _isScheduled = false;

  /// The connection is being opened: drop any pending retry, keeping the
  /// attempt counters — a retry budget spans across open attempts.
  void beforeOpening() {
    _timer?.cancel();
    _timer = null;
    _isScheduled = false;
  }

  /// The backoff is over: connection established, service down or session
  /// invalidated. Clears both attempt counters and anything pending.
  void reset() {
    beforeOpening();
    _authFailures = 0;
    _reconnectAttempts = 0;
  }

  /// Reaction to the node draining for a deploy: reconnect with backoff.
  ///
  /// Kept running indefinitely like the SDK's own reconnect loop, since the
  /// node may drain repeatedly during a rolling deploy.
  void afterServerShutdown() {
    if (_isScheduled) return;
    _reconnectAttempts++;
    final delay = _reconnectBackoffStart * (1 << (_reconnectAttempts - 1));
    final capped = delay > _reconnectBackoffMax ? _reconnectBackoffMax : delay;
    debugPrint('Reconnecting after server shutdown in ${capped.inSeconds}s...');
    _isScheduled = true;
    _timer = Timer(capped, () {
      _timer = null;
      _isScheduled = false;
      onOpen();
    });
  }

  /// Reaction to the invalid-token disconnect: reconnect with a forcibly
  /// refreshed access token, with a bounded number of attempts before the
  /// session is treated as invalid.
  ///
  /// Only one retry is ever pending at a time: scheduling a new retry
  /// cancels any previously scheduled one.
  void afterAuthFailure(String errorCode) {
    _timer?.cancel();
    _timer = null;

    _authFailures++;

    if (_authFailures > _maxAuthRetries) {
      debugPrint(
        'Auth retries exhausted after $_authFailures failures '
        '(last error: $errorCode). Treating session as invalid.',
      );
      _authFailures = 0;
      onSessionInvalid();
      return;
    }

    final delay = _authRetryBackoffStart * (1 << (_authFailures - 1));
    debugPrint(
      'Auth error ($errorCode), retry $_authFailures/$_maxAuthRetries '
      'with fresh token in ${delay.inSeconds}s...',
    );
    _timer = Timer(delay, () {
      _timer = null;
      _reconnectAttempts = 0;
      onOpen(forceRefreshToken: true);
    });
  }
}

/// The realtime client gave up on the session: the socket status goes
/// offline and the session-invalid event goes on the bus, so the app routes
/// the user back to sign in.
void emitSessionInvalid(Ref ref) {
  ref.read(statusProvider.notifier).setSocketStatus(isConnected: false);
  ref.read(eventBusProvider).emit(const InvalidSessionEvent());
}
