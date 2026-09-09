import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/files_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/chat_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/right_button_bottom_bar.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

Finder findPlayIcon() => find.byWidgetPredicate(
  (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedPlay,
);

Finder findPauseIcon() => find.byWidgetPredicate(
  (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedPause,
);

Future<void> pumpBottomBar(
  WidgetTester tester,
  ProviderContainer container,
  String chatUUID,
) {
  return tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        localizationsDelegates: localizationsDelegates,
        supportedLocales: supportedLocales,
        locale: const Locale('en'),
        home: Scaffold(
          body: Align(
            alignment: Alignment.bottomCenter,
            child: ChatBottomBar(chatUUID: chatUUID),
          ),
        ),
      ),
    ),
  );
}

void main() {
  setUpAll(() async {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
    await AppDatabase.instance.initialize(inMemory: true);
  });

  tearDown(() async {
    await AppDatabase.instance.clear();
    ChatAudioService.instance.resetForTesting();
  });

  group('FilesBar draft previews', () {
    testWidgets('audio draft chip shows play icon and toggles playback',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-audio').notifier).setFiles([
        {
          'name': 'song.mp3',
          'uri': 'file:///local/song.mp3',
          'path': 'file:///local/song.mp3',
          'size': 1024,
          'mimeType': 'audio/mpeg',
        },
      ]);

      await pumpBottomBar(tester, container, 'chat-audio');
      await tester.pumpAndSettle();

      expect(find.text('song.mp3'), findsOneWidget);
      expect(findPlayIcon(), findsOneWidget);

      await tester.tap(findPlayIcon());
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Real platform playback is unavailable in tests, but tapping the
      // draft chip must route to ChatAudioService without throwing.
      expect(tester.takeException(), isNull);
      expect(find.text('song.mp3'), findsOneWidget);

      // The chip reflects service state like sent audio messages do.
      ChatAudioService.instance.setActiveItemForTesting(
        'draft:chat-audio:0',
        isPlaying: true,
        duration: const Duration(seconds: 10),
      );
      await tester.pump();

      expect(findPauseIcon(), findsOneWidget);
    });

    testWidgets('voice draft chip renders and reflects playing state',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-voice').notifier).setFiles([
        {
          'name': 'novyse_vocal_123.m4a',
          'uri': 'file:///local/novyse_vocal_123.m4a',
          'path': 'file:///local/novyse_vocal_123.m4a',
          'size': 2048,
          'mimeType': 'audio/aac',
          'type': 'VOICE',
        },
      ]);

      await pumpBottomBar(tester, container, 'chat-voice');
      await tester.pumpAndSettle();

      expect(find.text('novyse_vocal_123.m4a'), findsOneWidget);
      expect(findPlayIcon(), findsOneWidget);

      ChatAudioService.instance.setActiveItemForTesting(
        'draft:chat-voice:0',
        isPlaying: true,
        duration: const Duration(seconds: 10),
      );
      await tester.pump();

      expect(findPauseIcon(), findsOneWidget);
    });

    testWidgets('tapping an image chip opens the media viewer gallery',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-img').notifier).setFiles([
        {
          'name': 'pic.png',
          'uri': '/tmp/pic.png',
          'path': '/tmp/pic.png',
          'size': 1024,
          'mimeType': 'image/png',
        },
      ]);

      await pumpBottomBar(tester, container, 'chat-img');
      await tester.pumpAndSettle();

      await tester.tap(find.text('pic.png'));
      // Fixed pumps: the viewer shows loading spinners while the image
      // resolves, which would keep pumpAndSettle waiting forever.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));
      await tester.pump(const Duration(milliseconds: 200));

      // ChatMediaViewerPage shows the position indicator in the app bar.
      expect(find.text('1 / 1'), findsOneWidget);
    });

    testWidgets('tapping an unresolvable file shows an error snackbar',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-pdf').notifier).setFiles([
        {'name': 'doc.pdf', 'size': 800000, 'mimeType': 'application/pdf'},
      ]);

      await pumpBottomBar(tester, container, 'chat-pdf');
      await tester.pumpAndSettle();

      await tester.tap(find.text('doc.pdf'));
      await tester.pumpAndSettle();

      expect(find.text('Unable to preview this file'), findsOneWidget);
    });

    testWidgets('FilesBar still renders plain chips for generic files',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-mix').notifier).setFiles([
        {
          'name': 'clip.mp4',
          'uri': '/tmp/clip.mp4',
          'path': '/tmp/clip.mp4',
          'size': 500000,
          'mimeType': 'video/mp4',
        },
        {
          'name': 'song.mp3',
          'uri': 'file:///local/song.mp3',
          'path': 'file:///local/song.mp3',
          'size': 1024,
          'mimeType': 'audio/mpeg',
        },
      ]);

      await pumpBottomBar(tester, container, 'chat-mix');
      await tester.pumpAndSettle();

      expect(find.byType(FilesBar), findsOneWidget);
      expect(find.text('clip.mp4'), findsOneWidget);
      expect(find.text('song.mp3'), findsOneWidget);
      // Only the audio file gets the play icon instead of the category icon.
      expect(findPlayIcon(), findsOneWidget);
    });

    testWidgets('files list scrolls horizontally to reveal all files',        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-scroll').notifier).setFiles([
        for (var i = 0; i < 10; i++)
          {'name': 'file_$i.txt', 'size': 1024, 'mimeType': 'text/plain'},
      ]);

      await pumpBottomBar(tester, container, 'chat-scroll');
      await tester.pumpAndSettle();

      expect(find.text('file_0.txt'), findsOneWidget);
      // The last file starts off-screen in the horizontal list.
      expect(find.text('file_9.txt'), findsNothing);

      final scrollable = find.descendant(
        of: find.byType(FilesBar),
        matching: find.byType(Scrollable),
      );
      expect(scrollable, findsOneWidget);

      await tester.fling(scrollable, const Offset(-600, 0), 2000);
      await tester.pumpAndSettle();

      expect(find.text('file_9.txt'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('audio chip shows a seek bar that seeks without throwing',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-seek').notifier).setFiles([
        {
          'name': 'song.mp3',
          'uri': 'file:///local/song.mp3',
          'path': 'file:///local/song.mp3',
          'size': 1024,
          'mimeType': 'audio/mpeg',
          'duration': 120,
        },
      ]);

      await pumpBottomBar(tester, container, 'chat-seek');
      await tester.pumpAndSettle();

      final seekBar = find.byKey(const Key('draft_seek_0'));
      expect(seekBar, findsOneWidget);

      // Tapping while inactive routes to playback without crashing
      // (real platform playback is unavailable in tests).
      await tester.tap(seekBar);
      await tester.pump();
      // Seek/playback use 500ms platform timeouts: let them elapse so no
      // timer is left pending at teardown.
      await tester.pump(const Duration(milliseconds: 600));
      expect(tester.takeException(), isNull);

      // Tapping while active routes to seek without crashing.
      ChatAudioService.instance.setActiveItemForTesting(
        'draft:chat-seek:0',
        isPlaying: true,
        position: const Duration(seconds: 5),
        duration: const Duration(seconds: 120),
      );
      await tester.pump();

      await tester.tap(seekBar);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      expect(tester.takeException(), isNull);
    });
    testWidgets('files scrollbar is slim and reserves its own lane',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-bar').notifier).setFiles([
        for (var i = 0; i < 10; i++)
          {'name': 'doc_$i.pdf', 'size': 1024, 'mimeType': 'application/pdf'},
      ]);

      await pumpBottomBar(tester, container, 'chat-bar');
      await tester.pumpAndSettle();

      final scrollbar = find.descendant(
        of: find.byType(FilesBar),
        matching: find.byType(RawScrollbar),
      );
      expect(scrollbar, findsOneWidget);

      final widget = tester.widget<RawScrollbar>(scrollbar);
      expect(widget.thickness, 4);
      expect(widget.trackVisibility, isFalse);
      expect(tester.takeException(), isNull);
    });
    testWidgets('audio and plain chips share the same height',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-height').notifier).setFiles([
        {'name': 'doc.pdf', 'size': 800000, 'mimeType': 'application/pdf'},
        {
          'name': 'song.mp3',
          'uri': 'file:///local/song.mp3',
          'path': 'file:///local/song.mp3',
          'size': 1024,
          'mimeType': 'audio/mpeg',
        },
      ]);

      await pumpBottomBar(tester, container, 'chat-height');
      await tester.pumpAndSettle();

      final plainSize = tester.getSize(find.byKey(const Key('file_chip_doc.pdf')));
      final audioSize = tester.getSize(find.byKey(const Key('file_chip_song.mp3')));

      // Same height: rows stay vertically aligned, the seek bar lives in the
      // shared bottom lane without raising the audio content.
      expect(audioSize.height, plainSize.height);
      expect(tester.takeException(), isNull);
    });

    testWidgets('sending stops an ongoing draft audio preview', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-send').notifier).setFiles([
        {
          'name': 'song.mp3',
          'uri': 'file:///local/song.mp3',
          'path': 'file:///local/song.mp3',
          'size': 1024,
          'mimeType': 'audio/mpeg',
        },
      ]);

      await pumpBottomBar(tester, container, 'chat-send');
      await tester.pumpAndSettle();

      // Simulate an ongoing draft preview playback.
      ChatAudioService.instance.setActiveItemForTesting(
        'draft:chat-send:0',
        isPlaying: true,
        duration: const Duration(seconds: 120),
      );
      await tester.pump();
      expect(findPauseIcon(), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'hello');
      await tester.pump();

      await tester.tap(find.byType(RightButtonBottomBar));
      // Playback stop uses 500ms platform timeouts: let them elapse.
      await tester.pump(const Duration(milliseconds: 600));

      expect(container.read(chatDraftProvider('chat-send')).files, isEmpty);
      expect(ChatAudioService.instance.activeId, isNull);
      expect(tester.takeException(), isNull);
    });
  });
}
