import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/message/message_play_button.dart';

void main() {
  group('MessagePlayButton', () {
    testWidgets('loading uses the same primary color as a playable button', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessagePlayButton(
              isPlaying: false,
              isPlayable: false,
              isLoading: true,
            ),
          ),
        ),
      );

      final button = find.byType(MessagePlayButton);
      final scheme = Theme.of(tester.element(button)).colorScheme;
      final container = tester.widget<Container>(
        find.descendant(of: button, matching: find.byType(Container)),
      );
      final decoration = container.decoration! as BoxDecoration;

      expect(decoration.color, scheme.primary);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(
        tester
            .widget<CircularProgressIndicator>(
              find.byType(CircularProgressIndicator),
            )
            .color,
        scheme.onPrimary,
      );
    });

    testWidgets('playable uses the primary color', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessagePlayButton(isPlaying: false, isPlayable: true),
          ),
        ),
      );

      final button = find.byType(MessagePlayButton);
      final scheme = Theme.of(tester.element(button)).colorScheme;
      final container = tester.widget<Container>(
        find.descendant(of: button, matching: find.byType(Container)),
      );
      final decoration = container.decoration! as BoxDecoration;

      expect(decoration.color, scheme.primary);
    });
  });
}
