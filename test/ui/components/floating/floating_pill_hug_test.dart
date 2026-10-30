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
      const FloatingPill(
        padding: EdgeInsets.all(9),
        child: SizedBox(
          width: FloatingConsts.iconButtonSize,
          height: FloatingConsts.iconButtonSize,
          child: Center(child: Icon(Icons.call, size: 22)),
        ),
      ),
    );

    // 44 content + 9 + 9 glass = 62 circle, NOT 320 wide.
    const expected = FloatingConsts.iconButtonSize + 18;
    expect(pillSize(tester), const Size(expected, expected));
  });

  testWidgets('opt-out pill shrink-wraps small overlay content', (
    tester,
  ) async {
    await pumpPill(
      tester,
      const FloatingPill(
        padding: EdgeInsets.all(2),
        enforceMinSize: false,
        child: SizedBox(
          width: 32,
          height: 32,
          child: Icon(Icons.mic, size: 18),
        ),
      ),
    );

    // 32 content + 2 + 2 glass = 36 chip, no 48 minimum imposed.
    expect(pillSize(tester), const Size(36, 36));
  });

  testWidgets('narrow content gets the min box without repositioning', (
    tester,
  ) async {
    await pumpPill(
      tester,
      const FloatingPill(
        padding: EdgeInsets.zero,
        child: SizedBox(width: 32, height: 32),
      ),
    );

    final pillElement = find.byType(FloatingPill).evaluate().single;
    final pillBox = pillElement.renderObject! as RenderBox;
    final pillTopLeft = pillBox.localToGlobal(Offset.zero);
    // Minimum enforced...
    expect(pillBox.size, const Size(48, 48));

    final childElement = find.byType(SizedBox).evaluate().single;
    final childBox = childElement.renderObject! as RenderBox;
    final childTopLeft = childBox.localToGlobal(Offset.zero);
    // ...but no centering: plain hug, tight constraints flow down.
    // Centering short content is each call site's job (Align, Center,
    // centered Rows/Columns) — never the pill's, so it can never stretch.
    expect(childTopLeft - pillTopLeft, Offset.zero);
  });
}
