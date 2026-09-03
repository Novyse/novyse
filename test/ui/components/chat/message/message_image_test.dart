import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/message/message_image.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MessageImage Widget Tests', () {
    testWidgets(
      'renders single image placeholder without cached_network_image',
      (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: MessageImage(fileRef: null, uuid: '', isSingle: true),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(MessageImage), findsOneWidget);
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      },
    );

    testWidgets('renders pending state with opacity', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageImage(
              fileRef: null,
              uuid: '',
              isSingle: true,
              isPending: true,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byType(MessageImage), findsOneWidget);
    });

    testWidgets(
      'renders media grid with isSingle: false without box.dart assertion',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: const [
                      Expanded(
                        child: MessageImage(
                          fileRef: null,
                          uuid: '',
                          isSingle: false,
                        ),
                      ),
                      Expanded(
                        child: MessageImage(
                          fileRef: null,
                          uuid: '',
                          isSingle: false,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(MessageImage), findsNWidgets(2));
        expect(tester.takeException(), isNull);

        // Verify mouse movement does not trigger mouse_tracker assertion
        final gesture = await tester.createGesture(
          kind: PointerDeviceKind.mouse,
        );
        await gesture.addPointer(location: Offset.zero);
        await gesture.moveTo(tester.getCenter(find.byType(MessageImage).first));
        await tester.pump();
        expect(tester.takeException(), isNull);
        await gesture.removePointer();
      },
    );
  });
}
