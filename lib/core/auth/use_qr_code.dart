import 'dart:async';

import 'package:flutter/foundation.dart';

import '../services/auth.dart';

/// State of QR Code authentication, countdown timer, and loading/error status.
class QrCodeState {
  const QrCodeState({
    this.qrToken,
    this.remainingTime = 0,
    this.isLoading = false,
    this.error,
  });

  final String? qrToken;
  final int remainingTime;
  final bool isLoading;
  final String? error;

  QrCodeState copyWith({
    String? qrToken,
    int? remainingTime,
    bool? isLoading,
    String? error,
    bool clearToken = false,
    bool clearError = false,
  }) {
    return QrCodeState(
      qrToken: clearToken ? null : (qrToken ?? this.qrToken),
      remainingTime: remainingTime ?? this.remainingTime,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Controller managing QR Code session generation, status polling,
/// countdown timer, and automatic refresh upon expiration.
///
/// Ported from React Native `useQRCode.ts`.
class QrCodeController extends ChangeNotifier {
  QrCodeController({this.onAuthorized});

  final ValueChanged<Map<String, dynamic>>? onAuthorized;

  QrCodeState _state = const QrCodeState();
  QrCodeState get state => _state;

  Timer? _pollingTimer;
  Timer? _countdownTimer;
  bool _isDisposed = false;

  void init() {
    fetchQrToken();
  }

  void _stopTimers() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _countdownTimer?.cancel();
    _countdownTimer = null;
  }

  Future<void> fetchQrToken() async {
    if (_isDisposed || _state.isLoading) return;

    _state = _state.copyWith(isLoading: true, clearError: true);
    notifyListeners();

    try {
      final res = await auth.qrcode.newSession();
      if (_isDisposed) return;

      if (res.success && res.data != null) {
        final token = res.data!['token'] as String?;
        final expiresAt = res.data!['expiresAt'];
        var remaining = 0;

        if (expiresAt is int) {
          if (expiresAt > 1000000000000) {
            remaining =
                ((expiresAt - DateTime.now().millisecondsSinceEpoch) / 1000)
                    .floor();
          } else if (expiresAt > 1000000000) {
            remaining =
                expiresAt - (DateTime.now().millisecondsSinceEpoch ~/ 1000);
          } else {
            remaining = expiresAt;
          }
        } else if (expiresAt is num) {
          remaining = expiresAt.toInt();
        }

        if (remaining < 0) remaining = 0;

        _state = QrCodeState(
          qrToken: token,
          remainingTime: remaining,
          isLoading: false,
        );
        notifyListeners();

        _startTimers();
      } else {
        _state = _state.copyWith(
          isLoading: false,
          error: res.error ?? 'Failed to generate QR token',
        );
        notifyListeners();
      }
    } catch (e) {
      if (!_isDisposed) {
        _state = _state.copyWith(isLoading: false, error: e.toString());
        notifyListeners();
      }
    }
  }

  void _startTimers() {
    _stopTimers();

    final token = _state.qrToken;
    if (token != null && token.isNotEmpty) {
      _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
        if (_isDisposed || _state.qrToken == null) return;
        try {
          final res = await auth.qrcode.status(_state.qrToken!);
          if (_isDisposed) return;
          if (res.success && res.data != null) {
            if (res.data!['status'] == 'AUTHORIZED') {
              _stopTimers();
              onAuthorized?.call(res.data!);
            }
          } else if (!res.success) {
            _stopTimers();
            fetchQrToken();
          }
        } catch (_) {}
      });
    }

    if (_state.remainingTime > 0) {
      _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (_isDisposed) return;
        if (_state.remainingTime > 1) {
          _state = _state.copyWith(remainingTime: _state.remainingTime - 1);
          notifyListeners();
        } else {
          _stopTimers();
          _state = _state.copyWith(remainingTime: 0);
          notifyListeners();
          fetchQrToken();
        }
      });
    }
  }

  static String formatTime(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _isDisposed = true;
    _stopTimers();
    super.dispose();
  }
}
