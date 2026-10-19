import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/voice_recorder_controller.dart';

void main() {
  group('normalizeRecorderAmplitude', () {
    test('treats the silence floor as zero', () {
      expect(normalizeRecorderAmplitude(-60), 0);
      expect(normalizeRecorderAmplitude(-50), 0);
    });

    test('maps audible levels to the normalized range', () {
      expect(normalizeRecorderAmplitude(-25), closeTo(0.5, 0.001));
      expect(normalizeRecorderAmplitude(-1), closeTo(0.98, 0.001));
      expect(normalizeRecorderAmplitude(0), 1);
    });

    test('rises immediately but releases smoothly', () {
      expect(
        normalizeRecorderAmplitude(-25, previous: 0.1),
        closeTo(0.5, 0.001),
      );
      expect(
        normalizeRecorderAmplitude(-60, previous: 1),
        closeTo(0.65, 0.001),
      );
    });
  });
}
