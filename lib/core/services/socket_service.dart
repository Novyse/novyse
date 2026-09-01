import 'dart:async';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/services/auth.dart';
import 'package:novyse/core/stores/network_store.dart';
import 'package:novyse/core/stores/status_store.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/services/socket/event_receiver.dart';
import 'package:novyse/core/services/socket/event_sender.dart';

/// Default transports for Socket.IO connection.
const _transports = ['websocket', 'polling'];

const _maxAuthRetries = 4;
/// Base delay for exponential backoff when retrying after auth errors.
const _baseRetryDelay = Duration(seconds: 1);

/// Manages the Socket.IO connection lifecycle.
///
/// Equivalent of `SocketIO` object in the TypeScript codebase.
class SocketService {
  final Ref _ref;
  io.Socket? _socket;
  bool _isConnecting = false;

  int _authFailures = 0;
  Timer? _retryTimer;

  SocketService(this._ref) {
    // Auto connect/disconnect when network state changes
    _ref.listen(networkProvider, (previous, next) {
      if (next.isConnected && next.isSynced) {
        if (_socket == null || !_socket!.connected) {
          debugPrint('Network state → online+synced. Opening socket...');
          open();
        }
      } else {
        if (_socket != null) {
          debugPrint('Network state → offline/unsynced. Closing socket...');
          close();
        }
      }
    });

    // In-band token refresh: send new token over existing socket
    auth.token.onUpdate((newToken) {
      if (newToken != null && _socket != null && _socket!.connected) {
        debugPrint('Token updated, sending auth:refresh over existing socket');
        _socket!.emit('auth:refresh', {'token': newToken});
      }
    });
  }

  bool get isOpen => _socket != null && _socket!.connected;

  io.Socket? get socket => _socket;

  /// Opens the Socket.IO connection.
  Future<void> open({bool forceRefreshToken = false}) async {
    try {
      final networkState = _ref.read(networkProvider);
      if (!networkState.isConnected || !networkState.isSynced) {
        debugPrint('Cannot open socket: Network offline or not synced');
        return;
      }

      if (_isConnecting || isOpen) {
        debugPrint(
          'Socket.IO connection already in progress or already connected',
        );
        return;
      }

      _isConnecting = true;
      _retryTimer?.cancel();
      _retryTimer = null;

      final accessToken = await auth.token.get(
        forceRefresh: forceRefreshToken,
      );

      if (accessToken == null) {
        // No token available even after a (forced) refresh: the session is
        // invalid. Surface it instead of retrying forever.
        debugPrint('Socket.IO open aborted: no access token available');
        _isConnecting = false;
        _ref
            .read(statusProvider.notifier)
            .setSocketStatus(isConnected: false);
        _ref.read(eventBusProvider).emit(const InvalidSessionEvent());
        return;
      }

      _socket = io.io(
        config.socketBaseUrl,
        io.OptionBuilder()
            .setPath('/socket.io')
            .setTransports(_transports)
            .enableAutoConnect()
            .setAuth({'token': accessToken})
            .build(),
      );

      _socket!.onConnect((_) async {
        debugPrint('Socket.IO connection opened!');
        _isConnecting = false;
        _authFailures = 0;
        _retryTimer?.cancel();
        _retryTimer = null;
        _ref.read(statusProvider.notifier).setSocketStatus(isConnected: true);
        eventReceiver.initialize(
          _socket!,
          _ref.read(globalEventEmitterProvider),
        );
        eventSender.initialize(_socket!);
      });

      _socket!.on('connect_error', (error) {
        debugPrint('Socket.IO connect_error: $error');
        _isConnecting = false;

        final isOnline = _ref.read(networkProvider).isConnected;
        if (isOnline) {
          _ref
              .read(statusProvider.notifier)
              .setSocketStatus(isConnected: false, isConnecting: false);
        }

        final errorData = error is Map ? error['data'] : null;
        final errorCode = errorData is Map
            ? errorData['code'] as String?
            : null;
        if (errorCode == 'AUTH_NO_TOKEN' ||
            errorCode == 'AUTH_INVALID_TOKEN' ||
            errorCode == 'AUTH_TOKEN_EXPIRED') {
          _socket?.disconnect();
          _socket = null;
          _scheduleAuthRetry(errorCode!);
        }
      });

      _socket!.on('auth:expired', (_) {
        debugPrint(
          'Server notified token expired, reconnecting with fresh token...',
        );
        _socket?.disconnect();
        _socket = null;
        _isConnecting = false;
        _scheduleAuthRetry('AUTH_TOKEN_EXPIRED');
      });

      _socket!.on('auth:session-revoked', (_) {
        debugPrint('Session has been revoked by the server');
        _socket?.disconnect();
        _socket = null;
        _isConnecting = false;
        _retryTimer?.cancel();
        _retryTimer = null;
        _ref.read(statusProvider.notifier).setSocketStatus(isConnected: false);
        _ref.read(eventBusProvider).emit(const InvalidSessionEvent());
      });

      _socket!.on('auth:refreshed', (data) {
        if (data is Map) {
          final expiresAt = data['expiresAt'];
          debugPrint('Socket token refreshed, new expiry: $expiresAt');
        }
      });

      _socket!.on('auth:refresh:error', (data) {
        if (data is Map) {
          debugPrint(
            'Socket token refresh failed: ${data['code']} — ${data['message']}',
          );
          if (data['code'] == 'AUTH_IDENTITY_MISMATCH') {
            _socket?.disconnect();
            _socket = null;
            _isConnecting = false;
            _scheduleAuthRetry('AUTH_IDENTITY_MISMATCH');
          }
        }
      });

      _socket!.on('error', (error) {
        debugPrint('Socket.IO error: $error');
        _isConnecting = false;
      });

      _socket!.onDisconnect((reason) {
        _isConnecting = false;
        final isOnline = _ref.read(networkProvider).isConnected;
        if (isOnline) {
          _ref
              .read(statusProvider.notifier)
              .setSocketStatus(isConnected: false, isConnecting: false);
        }
        debugPrint('Closed Socket.IO connection: $reason');
      });
    } catch (error) {
      debugPrint('Socket.IO initialization error: $error');
      _isConnecting = false;
    }
  }

  /// Schedules a reconnect with a forcibly refreshed token after an
  /// auth-related failure.
  ///
  /// Uses exponential backoff (1s, 2s, 4s, 8s) and gives up after
  /// [_maxAuthRetries] consecutive failures, emitting [InvalidSessionEvent]
  /// so the app can route the user back to login instead of looping forever.
  /// Only one retry is ever pending at a time: scheduling a new retry cancels
  /// any previously scheduled one.
  void _scheduleAuthRetry(String errorCode) {
    _authFailures++;

    if (_authFailures > _maxAuthRetries) {
      debugPrint(
        'Socket auth retries exhausted after $_authFailures failures '
        '(last error: $errorCode). Treating session as invalid.',
      );
      _retryTimer?.cancel();
      _retryTimer = null;
      _ref.read(statusProvider.notifier).setSocketStatus(isConnected: false);
      _ref.read(eventBusProvider).emit(const InvalidSessionEvent());
      return;
    }

    final delay = _baseRetryDelay * (1 << (_authFailures - 1));
    debugPrint(
      'Socket auth error ($errorCode), retry $_authFailures/$_maxAuthRetries '
      'with fresh token in ${delay.inSeconds}s...',
    );
    _retryTimer?.cancel();
    _retryTimer = Timer(delay, () {
      _retryTimer = null;
      open(forceRefreshToken: true);
    });
  }

  void close() {
    _retryTimer?.cancel();
    _retryTimer = null;
    _authFailures = 0;
    if (_socket != null) {
      debugPrint('Closing Socket.IO connection');
      _socket!.disconnect();
      _socket = null;
    }
    _ref.read(statusProvider.notifier).setSocketStatus(isConnected: false);
  }

  /// Exposes the event sender for sending messages.
  /// Equivalent to `SocketIO.send()` in the TypeScript codebase.
  EventSender? send() {
    if (_socket == null || !_socket!.connected) {
      debugPrint('Cannot send message: Socket not connected');
      return null;
    }
    return eventSender;
  }
}

/// Riverpod provider for the [SocketService].
final socketServiceProvider = Provider<SocketService>((ref) {
  return SocketService(ref);
});
