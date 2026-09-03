import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/ui/components/chat/message/message_audio.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ChatAudioService.instance.resetForTesting();
  });

  group('MessageAudio Widget Tests', () {
    testWidgets('renders MessageAudio with name, slider, and duration', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageAudio(
              fileRef: 'file:///local/track.mp3',
              uuid: '',
              name: 'track.mp3',
              duration: 180,
              size: 2048000,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('track.mp3'), findsOneWidget);
      expect(find.byType(Slider), findsOneWidget);
      expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);
    });

    testWidgets(
      'tapping play on MessageAudio calls ChatAudioService without throwing',
      (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: MessageAudio(
                fileRef: 'file:///local/song.mp3',
                uuid: '',
                name: 'song.mp3',
                duration: 60,
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        final playButton = find.byIcon(Icons.play_arrow_rounded);
        expect(playButton, findsOneWidget);

        await tester.tap(playButton);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(tester.takeException(), isNull);
      },
    );

    testWidgets(
      'updates play button to pause when ChatAudioService becomes active and playing',
      (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: MessageAudio(
                fileRef: 'https://example.com/sound.mp3',
                uuid: 'audio-uuid-3',
                name: 'podcast.mp3',
                duration: 120,
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);

        // Simulate ChatAudioService active item for this UUID
        ChatAudioService.instance.setActiveItemForTesting(
          'audio-uuid-3',
          isPlaying: true,
          duration: const Duration(seconds: 120),
        );
        await tester.pump();

        expect(ChatAudioService.instance.isItemActive('audio-uuid-3'), isTrue);
        expect(find.byIcon(Icons.pause_rounded), findsOneWidget);
      },
    );
  });
}
