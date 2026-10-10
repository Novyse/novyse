import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/auth/use_qr_code.dart';

void main() {
  group('QrCodeController', () {
    test('formatTime formats seconds into M:SS correctly', () {
      expect(QrCodeController.formatTime(120), '2:00');
      expect(QrCodeController.formatTime(119), '1:59');
      expect(QrCodeController.formatTime(65), '1:05');
      expect(QrCodeController.formatTime(9), '0:09');
      expect(QrCodeController.formatTime(0), '0:00');
    });

    test('initial state defaults correctly', () {
      final controller = QrCodeController();
      expect(controller.state.qrToken, isNull);
      expect(controller.state.remainingTime, 0);
      expect(controller.state.isLoading, isFalse);
      expect(controller.state.error, isNull);
      controller.dispose();
    });

    test('copyWith updates state correctly', () {
      const state = QrCodeState(
        qrToken: 'test-token',
        remainingTime: 60,
        isLoading: false,
      );

      final updated = state.copyWith(remainingTime: 59);
      expect(updated.qrToken, 'test-token');
      expect(updated.remainingTime, 59);
      expect(updated.isLoading, isFalse);

      final cleared = updated.copyWith(clearToken: true);
      expect(cleared.qrToken, isNull);
      expect(cleared.remainingTime, 59);
    });
  });
}
