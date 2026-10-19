import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/waveform/waveform_view.dart';

Widget _wrap(Widget child) => MaterialApp(
  home: Scaffold(
    body: Center(child: SizedBox(width: 220, height: 40, child: child)),
  ),
);

CustomPaint _waveformPaint(WidgetTester tester) {
  return tester.widget<CustomPaint>(
    find.descendant(
      of: find.byType(WaveformView),
      matching: find.byType(CustomPaint),
    ),
  );
}

void main() {
  group('WaveformView', () {
    testWidgets('fit mode paints the provided samples', (tester) async {
      const samples = [0.1, 0.4, 0.9, 0.6, 0.3];

      await tester.pumpWidget(
        _wrap(const WaveformView(samples: samples, progress: 0.5, height: 35)),
      );

      final painter = _waveformPaint(tester).painter;
      expect(painter, isA<WaveformPainter>());
      expect((painter as WaveformPainter).samples, samples);
      expect(painter.fit, isTrue);
      expect(painter.progress, 0.5);
      expect(tester.takeException(), isNull);
    });

    testWidgets('rolling mode handles empty samples', (tester) async {
      await tester.pumpWidget(
        _wrap(const WaveformView(samples: [], fit: false, height: 22)),
      );

      final painter = _waveformPaint(tester).painter;
      expect(painter, isA<WaveformPainter>());
      expect((painter as WaveformPainter).samples, isEmpty);
      expect(painter.fit, isFalse);
      expect(tester.takeException(), isNull);
    });

    testWidgets('rolling mode animates new samples without layout errors', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrap(
          const WaveformView(samples: [0.2, 0.5, 0.8], fit: false, height: 22),
        ),
      );
      await tester.pump();

      await tester.pumpWidget(
        _wrap(
          const WaveformView(
            samples: [0.2, 0.5, 0.8, 0.3],
            fit: false,
            height: 22,
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 30));

      final painter = _waveformPaint(tester).painter;
      expect(painter, isA<WaveformPainter>());
      expect(
        (painter as WaveformPainter).scrollProgress,
        inExclusiveRange(0, 1),
      );
      expect(tester.takeException(), isNull);

      await tester.pumpAndSettle();
    });
  });
}
