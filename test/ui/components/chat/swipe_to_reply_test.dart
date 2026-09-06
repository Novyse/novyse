import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/message/swipe_to_reply.dart';

void main() {
  group('SwipeToReply Widget Tests', () {
    testWidgets('swiping right past threshold triggers onReply', (tester) async {
      bool replied = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 300,
                height: 60,
                child: SwipeToReply(
                  onReply: () => replied = true,
                  child: const Text('Hello world'),
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Hello world'), findsOneWidget);
      expect(replied, isFalse);

      // Drag right past threshold (threshold is ~42px)
      await tester.drag(find.text('Hello world'), const Offset(60, 0));
      await tester.pumpAndSettle();

      expect(replied, isTrue);
    });

    testWidgets('swiping left past threshold triggers onReply', (tester) async {
      bool replied = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 300,
                height: 60,
                child: SwipeToReply(
                  onReply: () => replied = true,
                  child: const Text('Hello left'),
                ),
              ),
            ),
          ),
        ),
      );

      expect(replied, isFalse);

      // Drag left past threshold
      await tester.drag(find.text('Hello left'), const Offset(-60, 0));
      await tester.pumpAndSettle();

      expect(replied, isTrue);
    });

    testWidgets('dragging below threshold does NOT trigger onReply', (tester) async {
      bool replied = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 300,
                height: 60,
                child: SwipeToReply(
                  onReply: () => replied = true,
                  child: const Text('Hello small drag'),
                ),
              ),
            ),
          ),
        ),
      );

      // Drag right below threshold (e.g. 20px)
      await tester.drag(find.text('Hello small drag'), const Offset(20, 0));
      await tester.pumpAndSettle();

      expect(replied, isFalse);
    });

    testWidgets('when enabled is false, dragging does not trigger onReply', (tester) async {
      bool replied = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 300,
                height: 60,
                child: SwipeToReply(
                  enabled: false,
                  onReply: () => replied = true,
                  child: const Text('Disabled drag'),
                ),
              ),
            ),
          ),
        ),
      );

      await tester.drag(find.text('Disabled drag'), const Offset(80, 0));
      await tester.pumpAndSettle();

      expect(replied, isFalse);
    });
  });
}
