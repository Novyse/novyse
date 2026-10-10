import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

/// The wrapper's own max-width/max-height box: the nearest [ConstrainedBox]
/// above the header that also contains the scroll view. `find.byType(Dialog)`
/// cannot be used because the dialog route hands its builder the full screen
/// box, and [OverlayBottomSheet] sizes to the sheet surface.
Finder contentBox() => find
    .ancestor(
      of: find.byType(OverlayHeader),
      matching: find.byType(ConstrainedBox),
    )
    .first;

/// A body tall enough to force scrolling and wide enough to fill the viewport,
/// so the scrollbar sits flush against the viewport edge as it does in the app.
Widget tallBody() =>
    const SizedBox(width: double.infinity, height: 2000, child: Text('body'));

/// Pumps a button that opens an overlay with the given configuration, then
/// taps it so the header/body contract can be asserted on the real chrome.
Future<void> openOverlay(
  WidgetTester tester, {
  required String title,
  String? subtitle,
  ResponsiveOverlayMode mode = ResponsiveOverlayMode.modal,
  bool showCloseButton = true,
  Widget? child,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: Builder(
          builder: (context) => Center(
            child: ElevatedButton(
              onPressed: () => ResponsiveOverlay.show<void>(
                context: context,
                title: title,
                subtitle: subtitle,
                mode: mode,
                showCloseButton: showCloseButton,
                child: child,
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('open'));
  await tester.pumpAndSettle();
}

void main() {
  group('OverlayHeader', () {
    testWidgets('renders the title', (tester) async {
      await openOverlay(tester, title: 'Share screen', child: const Text('body'));

      expect(find.byType(OverlayHeader), findsOneWidget);
      expect(find.text('Share screen'), findsOneWidget);
    });

    testWidgets('renders the subtitle only when provided', (tester) async {
      await openOverlay(
        tester,
        title: 'Share screen',
        subtitle: 'Pick what to stream',
        child: const Text('body'),
      );
      expect(find.text('Pick what to stream'), findsOneWidget);

      await openOverlay(tester, title: 'Share screen', child: const Text('body'));
      expect(find.byType(OverlayHeader), findsOneWidget);
      // No stray empty subtitle node.
      expect(find.text(''), findsNothing);
    });

    testWidgets('a dialog shows a close button by default', (tester) async {
      await openOverlay(tester, title: 'Share screen', child: const Text('body'));

      expect(find.byType(IconButton), findsOneWidget);
    });

    testWidgets('the close button pops the overlay', (tester) async {
      await openOverlay(tester, title: 'Share screen', child: const Text('body'));

      await tester.tap(find.byType(IconButton));
      await tester.pumpAndSettle();

      expect(find.byType(OverlayHeader), findsNothing);
    });

    testWidgets('showCloseButton false hides the close button', (
      tester,
    ) async {
      await openOverlay(
        tester,
        title: 'Share screen',
        showCloseButton: false,
        child: const Text('body'),
      );

      expect(find.byType(OverlayHeader), findsOneWidget);
      expect(find.byType(IconButton), findsNothing);
    });

    testWidgets('a bottom sheet never shows a close button', (tester) async {
      await openOverlay(
        tester,
        title: 'Share screen',
        // Requested, but a bottom sheet must ignore it: sheets are dismissed
        // by drag handle, swipe or barrier.
        showCloseButton: true,
        mode: ResponsiveOverlayMode.bottomsheet,
        child: const Text('body'),
      );

      expect(find.byType(OverlayBottomSheet), findsOneWidget);
      expect(find.byType(OverlayDialog), findsNothing);
      expect(find.text('Share screen'), findsOneWidget);
      expect(find.byType(IconButton), findsNothing);
    });

    testWidgets('the header is outside the scroll view', (tester) async {
      await openOverlay(
        tester,
        title: 'Share screen',
        subtitle: 'Pick what to stream',
        child: tallBody(),
      );

      // Header stays pinned: scrolling the tall body must not move it.
      final headerBefore = tester.getTopLeft(find.byType(OverlayHeader));
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -400));
      await tester.pumpAndSettle();
      final headerAfter = tester.getTopLeft(find.byType(OverlayHeader));

      expect(headerAfter, headerBefore);
    });

testWidgets('the scrollbar stays inside the overlay bounds', (
        tester,
      ) async {
      await openOverlay(
        tester,
        title: 'Share screen',
        child: tallBody(),
      );
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -400));
      await tester.pumpAndSettle();

      // Flutter paints the vertical scrollbar flush against the viewport's
      // cross axis edge, so the padding must live *outside* the scroll view:
      // otherwise the thumb is clipped by the rounded corner of the modal.
      final scrollView = tester.getRect(find.byType(SingleChildScrollView));
      final box = tester.getRect(contentBox());
      expect(scrollView.right, lessThan(box.right));
      expect(scrollView.bottom, lessThan(box.bottom));
    });

    testWidgets('a dialog stays within the max height factor', (tester) async {
      await openOverlay(tester, title: 'Share screen', child: tallBody());

      // defaultMaxHeightFactor 0.85 on the default 600px test surface.
      expect(
        tester.getSize(contentBox()).height,
        lessThanOrEqualTo(600 * 0.85 + 0.5),
      );
    });

    testWidgets('a bottom sheet stays within the max height factor', (
      tester,
    ) async {
      await openOverlay(
        tester,
        title: 'Share screen',
        mode: ResponsiveOverlayMode.bottomsheet,
        child: tallBody(),
      );

      expect(
        tester.getSize(contentBox()).height,
        lessThanOrEqualTo(600 * 0.75 + 0.5),
      );
    });
  });
}