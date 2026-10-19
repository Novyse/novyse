import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/slider/app_progress_slider.dart';
import 'package:novyse/ui/components/waveform/waveform_view.dart';

Widget _wrap(Widget child) => MaterialApp(
  home: Scaffold(body: Center(child: child)),
);

void main() {
  group('AppProgressSlider linear mode', () {
    testWidgets('renders a Slider and reports seek', (tester) async {
      double? seeked;
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 240,
            child: AppProgressSlider(
              positionMs: 250,
              totalMs: 1000,
              onSeek: (v) => seeked = v,
            ),
          ),
        ),
      );

      expect(find.byType(Slider), findsOneWidget);
      final slider = tester.widget<Slider>(find.byType(Slider));
      expect(slider.value, 250);
      expect(slider.max, 1000);

      slider.onChanged!(500);
      expect(seeked, 500);
      expect(tester.takeException(), isNull);
    });

    testWidgets('clamps position above max', (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 240,
            child: AppProgressSlider(
              positionMs: 5000,
              totalMs: 1000,
              onSeek: (_) {},
            ),
          ),
        ),
      );

      final slider = tester.widget<Slider>(find.byType(Slider));
      expect(slider.value, 1000);
      expect(tester.takeException(), isNull);
    });

    testWidgets('reports seek start and end around a drag', (tester) async {
      var started = 0;
      var ended = 0;
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 240,
            child: AppProgressSlider(
              positionMs: 250,
              totalMs: 1000,
              onSeek: (_) {},
              onSeekStart: () => started++,
              onSeekEnd: () => ended++,
            ),
          ),
        ),
      );

      final slider = tester.widget<Slider>(find.byType(Slider));
      slider.onChangeStart!(250);
      expect(started, 1);
      expect(ended, 0);

      slider.onChangeEnd!(500);
      expect(ended, 1);
      expect(tester.takeException(), isNull);
    });
  });

  group('AppProgressSlider waveform mode', () {
    testWidgets('renders CustomPaint and tap seeks proportionally', (
      tester,
    ) async {
      double? seeked;
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 200,
            child: AppProgressSlider(
              waveform: const [0.1, 0.4, 0.9, 0.6, 0.3],
              positionMs: 0,
              totalMs: 1000,
              onSeek: (v) => seeked = v,
            ),
          ),
        ),
      );

      expect(find.byType(CustomPaint), findsWidgets);
      expect(find.byType(WaveformView), findsOneWidget);

      final box = tester.getRect(find.byType(AppProgressSlider));
      // Tap at ~75% width → ~750ms.
      await tester.tapAt(Offset(box.left + box.width * 0.75, box.center.dy));
      await tester.pump();

      expect(seeked, isNotNull);
      expect(seeked!, closeTo(750, 50));
      expect(tester.takeException(), isNull);
    });

    testWidgets('reports seek start and end around a pointer gesture', (
      tester,
    ) async {
      var started = 0;
      var ended = 0;
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 200,
            child: AppProgressSlider(
              waveform: const [0.1, 0.4, 0.9, 0.6, 0.3],
              positionMs: 0,
              totalMs: 1000,
              onSeek: (_) {},
              onSeekStart: () => started++,
              onSeekEnd: () => ended++,
            ),
          ),
        ),
      );

      final box = tester.getRect(find.byType(AppProgressSlider));
      final gesture = await tester.startGesture(
        Offset(box.left + box.width * 0.25, box.center.dy),
      );
      await tester.pump();
      expect(started, 1);
      expect(ended, 0);

      await gesture.moveTo(Offset(box.left + box.width * 0.75, box.center.dy));
      await tester.pump();
      expect(started, 1);

      await gesture.up();
      await tester.pump();
      expect(ended, 1);
      expect(tester.takeException(), isNull);
    });

    testWidgets('no seek when onSeek is null', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const SizedBox(
            width: 200,
            child: AppProgressSlider(
              waveform: [0.2, 0.5, 0.8],
              positionMs: 100,
              totalMs: 1000,
            ),
          ),
        ),
      );

      expect(find.byType(AppProgressSlider), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
