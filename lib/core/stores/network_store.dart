import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// State

/// Immutable snapshot of the network / sync state.
class NetworkState {
  const NetworkState({
    this.isConnected = false,
    this.connectionType = const [],
    this.isSynced = false,
    this.isSocketConnected = false,
    this.apiError,
    this.syncRetryCountdown = 0,
  });

  final bool isConnected;
  final List<ConnectivityResult> connectionType;
  final bool isSynced;
  final bool isSocketConnected;
  final String? apiError;
  final int syncRetryCountdown;

  NetworkState copyWith({
    bool? isConnected,
    List<ConnectivityResult>? connectionType,
    bool? isSynced,
    bool? isSocketConnected,
    String? Function()? apiError,
    int? syncRetryCountdown,
  }) {
    return NetworkState(
      isConnected: isConnected ?? this.isConnected,
      connectionType: connectionType ?? this.connectionType,
      isSynced: isSynced ?? this.isSynced,
      isSocketConnected: isSocketConnected ?? this.isSocketConnected,
      apiError: apiError != null ? apiError() : this.apiError,
      syncRetryCountdown: syncRetryCountdown ?? this.syncRetryCountdown,
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
    });

    Connectivity().checkConnectivity().then((results) {
      state = state.copyWith(
        isConnected:
            results.isNotEmpty && !results.contains(ConnectivityResult.none),
        connectionType: results,
      );
    });
  }

  void setSynced(bool synced) => state = state.copyWith(isSynced: synced);

  void setSocketConnected(bool connected) =>
      state = state.copyWith(isSocketConnected: connected);

  void setApiError(String? error) =>
      state = state.copyWith(apiError: () => error);

  void setSyncRetryCountdown(int countdown) =>
      state = state.copyWith(syncRetryCountdown: countdown);
}

// Provider

/// Global provider for [NetworkNotifier].
final networkProvider = NotifierProvider<NetworkNotifier, NetworkState>(
  NetworkNotifier.new,
);
