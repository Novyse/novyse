import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/message/message_gif.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MessageGif Widget Tests', () {
    testWidgets('renders MessageGif with valid URL', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageGif(
              url: 'https://media.giphy.com/media/test/giphy.gif',
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(MessageGif), findsOneWidget);
    });

    testWidgets('empty URL renders empty container without crashing', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: MessageGif(url: '')),
        ),
      );
      await tester.pump();

      expect(find.byType(MessageGif), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
