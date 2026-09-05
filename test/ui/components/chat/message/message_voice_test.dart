import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/ui/components/chat/message/message_voice.dart';
import 'package:novyse/ui/components/huge_icon.dart';

Finder findPlayIcon() => find.byWidgetPredicate(
  (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedPlay,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ChatAudioService.instance.resetForTesting();
  });

  group('MessageVoice Widget Tests', () {
    testWidgets(
      'renders MessageVoice and waveform without RenderBox layout assertion',
      (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: MessageVoice(
                fileRef: 'file:///local/v1.aac',
                uuid: '',
                duration: 45,
                waveform: [0.1, 0.4, 0.9, 0.6, 0.3, 0.8, 0.5],
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byType(MessageVoice), findsOneWidget);
        expect(findPlayIcon(), findsOneWidget);
        expect(find.text('45s'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets('MessageVoice tap does not throw when unplayable', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageVoice(
              fileRef: 'file:///local/v2.aac',
              uuid: '',
              duration: 10,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      final playButton = findPlayIcon();
      expect(playButton, findsOneWidget);

      await tester.tap(playButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(tester.takeException(), isNull);
    });

    testWidgets(
      'single active audio guarantee: starting voice 2 halts voice 1',
      (tester) async {
        final audioService = ChatAudioService.instance;

        audioService.setActiveItemForTesting('voice-1', isPlaying: true);
        expect(audioService.isItemActive('voice-1'), isTrue);
        expect(audioService.isItemActive('voice-2'), isFalse);

        // Now set active item to voice 2
        audioService.setActiveItemForTesting('voice-2', isPlaying: true);

        // Voice 1 is no longer active
        expect(audioService.isItemActive('voice-1'), isFalse);
        expect(audioService.isItemActive('voice-2'), isTrue);
      },
    );
  });
}
