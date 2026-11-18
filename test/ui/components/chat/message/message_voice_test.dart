import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:material_ui/material_ui.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/message/message_voice.dart';
import 'package:novyse/ui/components/huge_icon.dart';

Finder findPlayIcon() => find.byWidgetPredicate(
  (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedPlay,
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

  group('MessageVoice Widget Tests', () {
    testWidgets(
      'renders MessageVoice and waveform without RenderBox layout assertion',
      (tester) async {
        await tester.pumpWidget(
          wrapMessage(
            const MessageVoice(
              fileRef: 'file:///local/v1.aac',
              uuid: '',
              duration: 45,
              waveform: [0.1, 0.4, 0.9, 0.6, 0.3, 0.8, 0.5],
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

    testWidgets('shows a loading placeholder while the voice file resolves', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrapMessage(const MessageVoice(fileRef: 'missing-voice-ref', uuid: '')),
      );

      expect(find.byType(MessageVoice), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('0s'), findsNothing);

      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull);
    });

    testWidgets('MessageVoice tap does not throw when unplayable', (
      tester,
    ) async {
      await tester.pumpWidget(
        wrapMessage(
          const MessageVoice(
            fileRef: 'file:///local/v2.aac',
            uuid: '',
            duration: 10,
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

    testWidgets('reads the sender name from the user store', (tester) async {
      const sender = UserModel(uuid: 'sender-2', name: 'Giulia');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [userProvider('sender-2').overrideWithValue(sender)],
          child: const MaterialApp(
            home: Scaffold(
              body: MessageVoice(
                fileRef: 'file:///local/voice-notification.aac',
                uuid: 'voice-notification',
                duration: 10,
                senderUUID: 'sender-2',
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      await tester.tap(findPlayIcon());
      await tester.pump();

      expect(ChatAudioService.instance.activeTitle, 'Giulia');
      expect(ChatAudioService.instance.activeIsVoice, isTrue);
    });
  });
}
