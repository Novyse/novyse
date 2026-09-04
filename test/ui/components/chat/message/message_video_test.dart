import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/chat/message/message_video.dart';
import 'package:novyse/ui/components/huge_icon.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MessageVideo Widget Tests', () {
    testWidgets(
      'renders video thumbnail with play icon and formatted duration',
      (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: MessageVideo(
                fileRef: 'file:///local/video.mp4',
                uuid: '',
                duration: 125, // 2:05
                isSingle: true,
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(MessageVideo), findsOneWidget);
        expect(
          find.byWidgetPredicate(
            (w) =>
                w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedPlay,
          ),
          findsOneWidget,
        );
        expect(find.text('2:05'), findsOneWidget);
      },
    );

    testWidgets('renders video thumbnail in grid with isSingle: false', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Row(
              children: const [
                Expanded(
                  child: MessageVideo(
                    fileRef: 'file:///local/video.mp4',
                    uuid: '',
                    isSingle: false,
                    duration: 60,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byType(MessageVideo), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('renders pending state spinner when pending', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageVideo(
              fileRef: null,
              uuid: '',
              isPending: true,
              isSingle: true,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });
}
