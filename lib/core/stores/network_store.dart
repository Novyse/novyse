import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'status_store.dart';

// State

/// Immutable snapshot of the pure network & sync infrastructure state.
class NetworkState {
  const NetworkState({
    this.isConnected = false,
    this.connectionType = const [],
    this.isSynced = false,
  });

  final bool isConnected;
  final List<ConnectivityResult> connectionType;
  final bool isSynced;

  NetworkState copyWith({
    bool? isConnected,
    List<ConnectivityResult>? connectionType,
    bool? isSynced,
  }) {
    return NetworkState(
      isConnected: isConnected ?? this.isConnected,
      connectionType: connectionType ?? this.connectionType,
      isSynced: isSynced ?? this.isSynced,
    );
  }
}

// Notifier

/// Riverpod [Notifier] that manages network & sync state.
class NetworkNotifier extends Notifier<NetworkState> {
  bool _initialized = false;

  @override
  NetworkState build() {
    if (!_initialized) {
      _initialized = true;
      _init();
    }
    return const NetworkState();
  }

  void _init() {
    Connectivity().onConnectivityChanged.listen((results) {
      final connected =
          results.isNotEmpty && !results.contains(ConnectivityResult.none);
      state = state.copyWith(isConnected: connected, connectionType: results);
      ref.read(statusProvider.notifier).setOffline(!connected);
    });

    Connectivity().checkConnectivity().then((results) {
      final connected =
          results.isNotEmpty && !results.contains(ConnectivityResult.none);
      state = state.copyWith(
        isConnected: connected,
        connectionType: results,
      );
      ref.read(statusProvider.notifier).setOffline(!connected);
    });
  }

  void setSynced(bool synced) => state = state.copyWith(isSynced: synced);
}

// Provider

/// Global provider for [NetworkNotifier].
final networkProvider = NotifierProvider<NetworkNotifier, NetworkState>(
  NetworkNotifier.new,
);
