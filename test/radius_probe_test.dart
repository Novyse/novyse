import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

const _green = Color(0xFF00FF00);
const _content = Color(0xFFFF00FF);
const _radius = 20.0;

Widget child() => Stack(
  fit: StackFit.expand,
  children: const [ColoredBox(color: _content)],
);

// A: current structure in comms_user_card.dart
Widget variantCurrent(double bw) => Container(
  decoration: BoxDecoration(
    borderRadius: BorderRadius.circular(_radius),
    border: Border.all(color: _green, width: bw),
  ),
  clipBehavior: Clip.antiAlias,
  child: child(),
);

// B: border moved to foregroundDecoration (paints on top, no child inset)
Widget variantForeground(double bw) => Container(
  decoration: BoxDecoration(
    borderRadius: const BorderRadius.all(Radius.circular(_radius)),
  ),
  foregroundDecoration: BoxDecoration(
    borderRadius: BorderRadius.circular(_radius),
    border: Border.all(color: _green, width: bw),
  ),
  clipBehavior: Clip.antiAlias,
  child: child(),
);

// C: border kept in decoration, content clipped to the inner radius
Widget variantInnerClip(double bw) => Container(
  decoration: BoxDecoration(
    borderRadius: BorderRadius.circular(_radius),
    border: Border.all(color: _green, width: bw),
  ),
  clipBehavior: Clip.antiAlias,
  child: ClipRRect(
    borderRadius: BorderRadius.circular((_radius - bw).clamp(0.0, _radius)),
    child: child(),
  ),
);

Future<void> probe(WidgetTester tester, Widget w, String label) async {
  final key = GlobalKey();
  await tester.pumpWidget(
    MaterialApp(
      home: Center(
        child: RepaintBoundary(
          key: key,
          child: SizedBox(width: 200, height: 120, child: w),
        ),
      ),
    ),
  );
  final img = await tester
      .renderObject<RenderRepaintBoundary>(find.byKey(key))
      .toImage(pixelRatio: 1);
  final data = (await img.toByteData(format: ui.ImageByteFormat.rawRgba))!;
  int w2 = img.width, h2 = img.height;
  Color at(int x, int y) {
    final o = (y * w2 + x) * 4;
    return Color.fromARGB(data.getUint8(o + 3), data.getUint8(o),
        data.getUint8(o + 1), data.getUint8(o + 2));
  }

  var greenOnDiag = 0;
  var contentOnDiag = 0;
  for (var d = 0; d < 30; d++) {
    final p = at(d, d);
    if (p == _green) greenOnDiag++;
    if (p == _content) contentOnDiag++;
  }
  // How much of the border's total visible length is hidden by the content?
  var greenTopEdge = 0;
  for (var x = 0; x < w2; x++) {
    if (at(x, 0) == _green) greenTopEdge++;
  }
  debugPrint(
    '$label  bw=${(w2 - 2) ~/ 4}.${(w2 % 4) * 25}  '
    'greenOn45diagonal=$greenOnDiag  contentOn45diagonal=$contentOnDiag  '
    'greenOnTopRow=$greenTopEdge/$w2',
  );
}

void main() {
  testWidgets('border visibility', (tester) async {
    for (final bw in [1.0, 2.5]) {
      await probe(tester, variantCurrent(bw), 'A current      ');
      await probe(tester, variantForeground(bw), 'B foreground   ');
      await probe(tester, variantInnerClip(bw), 'C innerClip    ');
      debugPrint('');
    }
  });
}