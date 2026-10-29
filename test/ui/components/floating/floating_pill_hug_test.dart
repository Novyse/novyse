import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';

/// Regression test for the stretched-pill bug: `FloatingPill` used to carry
/// `alignment: Alignment.center` on its inner `Container`, which made it
/// expand to fill bounded parents (e.g. the 320-wide join button became a
/// full-width capsule instead of a circle). The pill must always hug.
void main() {
  Future<void> pumpPill(WidgetTester tester, Widget pill) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: pill,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Size pillSize(WidgetTester tester) {
    final element = find.byType(FloatingPill).evaluate().single;
    return (element.renderObject! as RenderBox).size;
  }

  testWidgets('join-style pill hugs its content instead of stretching', (
    tester,
  ) async {
    await pumpPill(
      tester,
      FloatingPill(
        padding: const EdgeInsets.all(9),
        child: SizedBox(
          width: FloatingConsts.iconButtonSize,
          height: FloatingConsts.iconButtonSize,
          child: const Center(child: Icon(Icons.call, size: 22)),
        ),
      ),
    );

    // 44 content + 9 + 9 glass = 62 circle, NOT 320 wide.
    final expected = FloatingConsts.iconButtonSize + 18;
    expect(pillSize(tester), Size(expected, expected));
  });

  testWidgets('opt-out pill shrink-wraps small overlay content', (
    tester,
  ) async {
    await pumpPill(
      tester,
      const FloatingPill(
        padding: EdgeInsets.all(2),
        enforceMinSize: false,
        child: SizedBox(width: 32, height: 32, child: Icon(Icons.mic, size: 18)),
      ),
    );

    // 32 content + 2 + 2 glass = 36 chip, no 48 minimum imposed.
    expect(pillSize(tester), const Size(36, 36));
  });
}
