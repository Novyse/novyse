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

/// Manages the Socket.IO connection lifecycle.
///
/// Equivalent of `SocketIO` object in the TypeScript codebase.
class SocketService {
  final Ref _ref;
  io.Socket? _socket;
  bool _isConnecting = false;

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

  Future<void> open() async {
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
      final accessToken = await auth.token.get();

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
          debugPrint(
            'Socket auth error ($errorCode), reconnecting with fresh token...',
          );
          _socket?.disconnect();
          _socket = null;
          _isConnecting = false;
          Future.delayed(const Duration(seconds: 1), open);
        }
      });

      _socket!.on('auth:expired', (_) {
        debugPrint('Server notified token expired, reconnecting...');
        _socket?.disconnect();
        _socket = null;
        _isConnecting = false;
        Future.delayed(const Duration(milliseconds: 500), open);
      });

      _socket!.on('auth:session-revoked', (_) {
        debugPrint('Session has been revoked by the server');
        _socket?.disconnect();
        _socket = null;
        _isConnecting = false;
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
            open();
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

  void close() {
    if (_socket != null) {
      debugPrint('Closing Socket.IO connection');
      _socket!.disconnect();
      _socket = null;
    }
    _ref.read(statusProvider.notifier).setSocketStatus(isConnected: true);
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
