import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/auth/qr_login_scanner.dart';
import 'package:novyse_auth/novyse_auth.dart';

void main() {
  group('QrLoginScannerController', () {
    test('starts in the idle state', () {
      final controller = QrLoginScannerController(
        authenticator: (_) async => const AuthResult.success({}),
      );

      expect(controller.status, QrLoginScanStatus.idle);
      expect(controller.canScan, isTrue);
      expect(controller.state.error, isNull);

      controller.dispose();
    });

    test('trims the scanned token and authorizes the session', () async {
      String? receivedToken;
      final controller = QrLoginScannerController(
        authenticator: (token) async {
          receivedToken = token;
          return const AuthResult<JsonMap>.success({'ok': true});
        },
      );

      final result = await controller.submit('  qr-token  ');

      expect(result, isTrue);
      expect(receivedToken, 'qr-token');
      expect(controller.status, QrLoginScanStatus.success);
      expect(controller.isSuccess, isTrue);
      expect(controller.canScan, isFalse);

      controller.dispose();
    });

    test('reports invalid or expired codes as a failure', () async {
      final controller = QrLoginScannerController(
        authenticator: (_) async =>
            const AuthResult<JsonMap>.failure('invalid token'),
      );

      final result = await controller.submit('qr-token');

      expect(result, isFalse);
      expect(controller.status, QrLoginScanStatus.failure);
      expect(controller.hasFailed, isTrue);
      expect(controller.state.error, 'invalid token');

      controller.reset();
      expect(controller.status, QrLoginScanStatus.idle);
      expect(controller.state.error, isNull);

      controller.dispose();
    });

    test('turns thrown errors into a failure state', () async {
      final controller = QrLoginScannerController(
        authenticator: (_) async => throw Exception('network down'),
      );

      await controller.submit('qr-token');

      expect(controller.status, QrLoginScanStatus.failure);
      expect(controller.state.error, contains('network down'));

      controller.dispose();
    });

    test('ignores duplicate scans while a request is in flight', () async {
      final completer = Completer<AuthResult<JsonMap>>();
      var calls = 0;
      final controller = QrLoginScannerController(
        authenticator: (_) {
          calls++;
          return completer.future;
        },
      );

      final first = controller.submit('qr-token');
      expect(controller.status, QrLoginScanStatus.authenticating);
      expect(controller.isAuthenticating, isTrue);

      final second = await controller.submit('qr-token');
      expect(second, isFalse);
      expect(calls, 1);

      completer.complete(const AuthResult<JsonMap>.success({}));
      expect(await first, isTrue);
      expect(controller.status, QrLoginScanStatus.success);

      controller.dispose();
    });

    test('ignores blank scans without changing state', () async {
      var calls = 0;
      final controller = QrLoginScannerController(
        authenticator: (_) async {
          calls++;
          return const AuthResult<JsonMap>.success({});
        },
      );

      expect(await controller.submit('   '), isFalse);
      expect(calls, 0);
      expect(controller.status, QrLoginScanStatus.idle);

      controller.dispose();
    });

    test('ignores scans after a successful result', () async {
      var calls = 0;
      final controller = QrLoginScannerController(
        authenticator: (_) async {
          calls++;
          return const AuthResult<JsonMap>.success({});
        },
      );

      await controller.submit('first');
      expect(await controller.submit('second'), isFalse);
      expect(calls, 1);
      expect(controller.status, QrLoginScanStatus.success);

      controller.dispose();
    });
  });
}
