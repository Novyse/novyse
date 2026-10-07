import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/switch/segmented_switch.dart';

Widget _harness<T>(SegmentedSwitch<T> child) {
  return MaterialApp(home: Scaffold(body: child));
}

Size _segmentBoxOf(WidgetTester tester, String label) {
  final text = find.text(label);
  expect(text, findsOneWidget);
  final box = find.ancestor(of: text, matching: find.byType(SizedBox));
  expect(box, findsWidgets);
  return tester.getSize(box.first);
}

void main() {
  testWidgets('renders options and notifies on tap', (tester) async {
    String selected = 'media';
    await tester.pumpWidget(
      _harness(
        SegmentedSwitch<String>(
          options: const [
            SegmentedOption(value: 'media', label: 'Media'),
            SegmentedOption(value: 'files', label: 'Files'),
            SegmentedOption(value: 'links', label: 'Links'),
          ],
          value: selected,
          onChanged: (value) => selected = value,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Media'), findsOneWidget);
    expect(find.text('Files'), findsOneWidget);
    expect(find.text('Links'), findsOneWidget);

    await tester.tap(find.text('Files'));
    await tester.pumpAndSettle();
    expect(selected, 'files');
  });

  testWidgets('segments share the container width equally', (tester) async {
    await tester.pumpWidget(
      _harness(
        SegmentedSwitch<String>(
          options: const [
            SegmentedOption(value: 'a', label: 'A'),
            SegmentedOption(value: 'b', label: 'Much longer label'),
          ],
          value: 'a',
          onChanged: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Mirrors `itemWidth = containerWidth / options.length`: every segment
    // gets the same width regardless of its content.
    final a = _segmentBoxOf(tester, 'A');
    final b = _segmentBoxOf(tester, 'Much longer label');
    expect(a.width, moreOrLessEquals(b.width, epsilon: 0.5));
  });

  testWidgets('indicator aligns exactly with the active segment', (
    tester,
  ) async {
    Future<AnimatedPositioned> indicator() async {
      await tester.pumpAndSettle();
      return tester.widget<AnimatedPositioned>(find.byType(AnimatedPositioned));
    }

    // First item: indicator starts at the segments origin.
    await tester.pumpWidget(
      _harness(
        SegmentedSwitch<String>(
          options: const [
            SegmentedOption(value: 'a', label: 'A'),
            SegmentedOption(value: 'b', label: 'B'),
            SegmentedOption(value: 'c', label: 'C'),
          ],
          value: 'a',
          onChanged: (_) {},
        ),
      ),
    );
    var segWidth = _segmentBoxOf(tester, 'A').width;
    var pos = await indicator();
    expect(pos.width, moreOrLessEquals(segWidth, epsilon: 0.5));
    expect(pos.left, moreOrLessEquals(0, epsilon: 0.5));

    // Last item: indicator ends exactly where the segments end
    // (no overshoot past the right edge).
    await tester.pumpWidget(
      _harness(
        SegmentedSwitch<String>(
          options: const [
            SegmentedOption(value: 'a', label: 'A'),
            SegmentedOption(value: 'b', label: 'B'),
            SegmentedOption(value: 'c', label: 'C'),
          ],
          value: 'c',
          onChanged: (_) {},
        ),
      ),
    );
    segWidth = _segmentBoxOf(tester, 'A').width;
    pos = await indicator();
    expect(pos.width, moreOrLessEquals(segWidth, epsilon: 0.5));
    expect(pos.left, moreOrLessEquals(2 * segWidth, epsilon: 0.5));
  });

  testWidgets('disabled option does not notify', (tester) async {
    String selected = 'media';
    await tester.pumpWidget(
      _harness(
        SegmentedSwitch<String>(
          options: const [
            SegmentedOption(value: 'media', label: 'Media'),
            SegmentedOption(value: 'files', label: 'Files', enabled: false),
          ],
          value: selected,
          onChanged: (value) => selected = value,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Files'));
    await tester.pumpAndSettle();
    expect(selected, 'media');
  });

  testWidgets('disabled switch does not notify', (tester) async {
    String selected = 'media';
    await tester.pumpWidget(
      _harness(
        SegmentedSwitch<String>(
          enabled: false,
          options: const [
            SegmentedOption(value: 'media', label: 'Media'),
            SegmentedOption(value: 'files', label: 'Files'),
          ],
          value: selected,
          onChanged: (value) => selected = value,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Files'));
    await tester.pumpAndSettle();
    expect(selected, 'media');
  });

  testWidgets('label header is rendered when provided', (tester) async {
    await tester.pumpWidget(
      _harness(
        SegmentedSwitch<String>(
          label: 'Privacy',
          options: const [
            SegmentedOption(value: 'a', label: 'A'),
            SegmentedOption(value: 'b', label: 'B'),
          ],
          value: 'a',
          onChanged: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Privacy'), findsOneWidget);
  });

  testWidgets('container keeps the available width while segments scroll', (
    tester,
  ) async {
    await tester.pumpWidget(
      _harness(
        SegmentedSwitch<int>(
          options: [
            for (var i = 0; i < 20; i++)
              SegmentedOption(value: i, label: 'Item $i'),
          ],
          value: 19,
          onChanged: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 20 labeled options need ~2200px: the pill itself must stay 800px
    // wide (default test surface) with the segments scrolling inside,
    // instead of growing past the viewport as a whole.
    final size = tester.getSize(find.byType(SegmentedSwitch<int>));
    expect(size.width, moreOrLessEquals(800, epsilon: 0.5));
  });

  testWidgets('many icon-only options scroll instead of overflowing', (
    tester,
  ) async {
    await tester.pumpWidget(
      _harness(
        SegmentedSwitch<int>(
          options: [
            for (var i = 0; i < 20; i++)
              const SegmentedOption(
                value: 0,
                icon: Icon(Icons.circle, size: 18),
              ),
          ],
          value: 0,
          onChanged: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    // `minWidth` 45 for icon-only options: 20 segments need ~900px, so the
    // strip must scroll. Rendering without a RenderFlex overflow proves it.
    expect(find.byIcon(Icons.circle), findsNWidgets(20));
    expect(find.byType(SingleChildScrollView), findsOneWidget);
  });
}
