import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:material_ui/material_ui.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/message/message_audio.dart';
import 'package:novyse/ui/components/huge_icon.dart';

Finder findPlayIcon() => find.byWidgetPredicate(
  (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedPlay,
);

Finder findPauseIcon() => find.byWidgetPredicate(
  (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedPause,
);

Widget wrapMessage(Widget child) {
  return ProviderScope(
    child: MaterialApp(home: Scaffold(body: child)),
  );
}

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
        wrapMessage(
          const MessageAudio(
            fileRef: 'file:///local/track.mp3',
            uuid: '',
            name: 'track.mp3',
            duration: 180,
            size: 2048000,
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('track.mp3'), findsOneWidget);
      expect(find.byType(Slider), findsOneWidget);
      expect(findPlayIcon(), findsOneWidget);
    });

    testWidgets('shows a loading placeholder while the audio file resolves', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrapMessage(
          const MessageAudio(
            fileRef: 'missing-audio-ref',
            uuid: '',
            name: 'voice-note.m4a',
          ),
        ),
      );

      expect(find.text('voice-note.m4a'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('0s'), findsNothing);

      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull);
    });

    testWidgets(
      'tapping play on MessageAudio calls ChatAudioService without throwing',
      (tester) async {
        await tester.pumpWidget(
          wrapMessage(
            const MessageAudio(
              fileRef: 'file:///local/song.mp3',
              uuid: '',
              name: 'song.mp3',
              duration: 60,
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
      },
    );

    testWidgets(
      'updates play button to pause when ChatAudioService becomes active and playing',
      (tester) async {
        await tester.pumpWidget(
          wrapMessage(
            const MessageAudio(
              fileRef: 'https://example.com/sound.mp3',
              uuid: 'audio-uuid-3',
              name: 'podcast.mp3',
              duration: 120,
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        expect(findPlayIcon(), findsOneWidget);

        // Simulate ChatAudioService active item for this UUID
        ChatAudioService.instance.setActiveItemForTesting(
          'audio-uuid-3',
          isPlaying: true,
          duration: const Duration(seconds: 120),
        );
        await tester.pump();

        expect(ChatAudioService.instance.isItemActive('audio-uuid-3'), isTrue);
        expect(findPauseIcon(), findsOneWidget);
      },
    );

    testWidgets('reads the sender name from the user store', (tester) async {
      const sender = UserModel(
        uuid: 'sender-1',
        name: 'Mario',
        surname: 'Rossi',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [userProvider('sender-1').overrideWithValue(sender)],
          child: const MaterialApp(
            home: Scaffold(
              body: MessageAudio(
                fileRef: 'file:///local/notification.mp3',
                uuid: 'audio-notification',
                name: 'notification.mp3',
                duration: 30,
                senderUUID: 'sender-1',
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      await tester.tap(findPlayIcon());
      await tester.pump();

      expect(ChatAudioService.instance.activeTitle, 'notification.mp3');
      expect(ChatAudioService.instance.activeSubtitle, 'Mario Rossi');
    });
  });
}
