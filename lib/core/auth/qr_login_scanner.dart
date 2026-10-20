import 'package:flutter/foundation.dart';
import 'package:novyse_auth/novyse_auth.dart' show AuthResult, JsonMap;

import '../services/auth.dart';

/// Authorizes a QR login session using the token encoded in the QR code.
typedef QrLoginAuthenticator = Future<AuthResult<JsonMap>> Function(
  String token,
);

enum QrLoginScanStatus { idle, authenticating, success, failure }

@immutable
class QrLoginScanState {
  const QrLoginScanState({this.status = QrLoginScanStatus.idle, this.error});

  final QrLoginScanStatus status;
  final String? error;

  QrLoginScanState copyWith({QrLoginScanStatus? status, String? error}) {
    return QrLoginScanState(status: status ?? this.status, error: error);
  }
}

/// Handles the authenticated half of the QR login flow: a logged-in device
/// scans the token shown by another device and authorizes that session.
class QrLoginScannerController extends ChangeNotifier {
  QrLoginScannerController({QrLoginAuthenticator? authenticator})
    : _authenticator = authenticator ?? _authenticateWithSdk;

  final QrLoginAuthenticator _authenticator;

  QrLoginScanState _state = const QrLoginScanState();
  QrLoginScanState get state => _state;

  QrLoginScanStatus get status => _state.status;
  bool get canScan => _state.status == QrLoginScanStatus.idle;
  bool get isAuthenticating =>
      _state.status == QrLoginScanStatus.authenticating;
  bool get isSuccess => _state.status == QrLoginScanStatus.success;
  bool get hasFailed => _state.status == QrLoginScanStatus.failure;

  bool _isDisposed = false;

  static Future<AuthResult<JsonMap>> _authenticateWithSdk(String token) {
    return auth.qrcode.authenticate(token);
  }

  /// Authorizes [rawCode]. Returns `true` when the session was accepted.
  Future<bool> submit(String rawCode) async {
    if (_isDisposed || !canScan) return false;

    final token = rawCode.trim();
    if (token.isEmpty) return false;

    _setState(const QrLoginScanState(status: QrLoginScanStatus.authenticating));

    try {
      final result = await _authenticator(token);
      if (_isDisposed) return false;

      if (result.success) {
        _setState(const QrLoginScanState(status: QrLoginScanStatus.success));
        return true;
      }

      _setState(
        QrLoginScanState(
          status: QrLoginScanStatus.failure,
          error: result.error,
        ),
      );
      return false;
    } catch (error) {
      if (_isDisposed) return false;
      _setState(
        QrLoginScanState(
          status: QrLoginScanStatus.failure,
          error: error.toString(),
        ),
      );
      return false;
    }
  }

  /// Returns to the scanning state after a failure.
  void reset() {
    if (_isDisposed) return;
    _setState(const QrLoginScanState());
  }

  void _setState(QrLoginScanState next) {
    _state = next;
    notifyListeners();
  }

  @override
  void dispose() {
    _isDisposed = true;
    super.dispose();
  }
}
