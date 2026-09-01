import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:super_drag_and_drop/super_drag_and_drop.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/files_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/chat_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/left_button_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/middle_bar_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/right_button_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/recording_dot.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/speech_indicator.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/voice_recorder_controller.dart';
import 'package:novyse/ui/components/chat/chat_drop_zone.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(() async {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
    await AppDatabase.instance.initialize(inMemory: true);
  });

  tearDown(() async {
    await AppDatabase.instance.clear();
  });

  group('ChatBottomBar and Components Tests', () {
    testWidgets('Renders normal bottom bar with +, text input and Mic icon when empty', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: Column(
                children: [
                  Spacer(),
                  ChatBottomBar(chatUUID: 'chat-test-1'),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(LeftButtonBottomBar), findsOneWidget);
      expect(find.byType(MiddleBarBottomBar), findsOneWidget);
      expect(find.byType(RightButtonBottomBar), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);

      // Verify mic icon is shown on RightButton when input is empty
      final micIcon = find.byWidgetPredicate(
        (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedMic02,
      );
      expect(micIcon, findsOneWidget);

      // Verify + icon is shown on LeftButton
      final plusIcon = find.byWidgetPredicate(
        (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedAdd01,
      );
      expect(plusIcon, findsWidgets);
    });

    testWidgets('Right button switches to Send icon when text is entered', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: Column(
                children: [
                  Spacer(),
                  ChatBottomBar(chatUUID: 'chat-test-1'),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Hello Novyse');
      await tester.pump();

      // Right button now displays Sent icon
      final sendIcon = find.byWidgetPredicate(
        (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedSent,
      );
      expect(sendIcon, findsOneWidget);
    });

    testWidgets('Right button switches to Send icon when draft has files', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      // Seed draft with a file
      container.read(chatDraftProvider('chat-test-1').notifier).setFiles([
        {
          'name': 'image.png',
          'size': 1024 * 1024,
          'mimeType': 'image/png',
        }
      ]);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: Column(
                children: [
                  Spacer(),
                  ChatBottomBar(chatUUID: 'chat-test-1'),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // FilesBar is rendered
      expect(find.byType(FilesBar), findsOneWidget);
      expect(find.text('1 file'), findsOneWidget);
      expect(find.text('image.png'), findsOneWidget);

      // Right button displays Send icon even with empty text
      final sendIcon = find.byWidgetPredicate(
        (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedSent,
      );
      expect(sendIcon, findsOneWidget);
    });

    testWidgets('FilesBar removes individual file and clears all files', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(chatDraftProvider('chat-test-1').notifier).setFiles([
        {'name': 'first.jpg', 'size': 500000, 'mimeType': 'image/jpeg'},
        {'name': 'second.pdf', 'size': 800000, 'mimeType': 'application/pdf'},
      ]);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: Align(
                alignment: Alignment.bottomCenter,
                child: ChatBottomBar(chatUUID: 'chat-test-1'),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('2 files'), findsOneWidget);
      expect(find.text('first.jpg'), findsOneWidget);
      expect(find.text('second.pdf'), findsOneWidget);

      // Tap remove on the second chip
      await tester.tap(find.byKey(const Key('remove_file_1')));
      await tester.pumpAndSettle();

      expect(find.text('1 file'), findsOneWidget);
      expect(find.text('first.jpg'), findsOneWidget);
      expect(find.text('second.pdf'), findsNothing);

      // Tap clear all on header
      await tester.tap(find.byKey(const Key('clear_all_files')));
      await tester.pumpAndSettle();

      expect(find.text('first.jpg'), findsNothing);
    });

    testWidgets('Voice recording state shows RecordingDot, SpeechIndicator and duration', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: Column(
                children: [
                  Spacer(),
                  ChatBottomBar(chatUUID: 'chat-test-1'),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Trigger recording state manually in provider
      container.read(voiceRecorderProvider('chat-test-1').notifier).state =
          const VoiceRecorderState(
        isRecording: true,
        isPaused: false,
        duration: Duration(seconds: 5, milliseconds: 320),
        amplitude: -18.5,
      );
      await tester.pump();

      expect(find.byType(RecordingDot), findsOneWidget);
      expect(find.byType(SpeechIndicator), findsOneWidget);
      expect(find.text('0:05.320'), findsOneWidget);

      // Right button shows Sent icon to stop & send
      final sendIcon = find.byWidgetPredicate(
        (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedSent,
      );
      expect(sendIcon, findsOneWidget);
    });

    testWidgets('Sending text message with files delegates to queue and clears draft', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      // Seed draft
      container.read(chatDraftProvider('chat-test-1').notifier).setFiles([
        {'name': 'attachment.png', 'size': 1024, 'mimeType': 'image/png'},
      ]);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: Column(
                children: [
                  Spacer(),
                  ChatBottomBar(chatUUID: 'chat-test-1'),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Message with attachment');
      await tester.pump();

      // Tap send button
      final sendBtn = find.byType(RightButtonBottomBar);
      await tester.tap(sendBtn);
      await tester.pump(const Duration(milliseconds: 100));

      // Verify draft state was cleared
      final draftState = container.read(chatDraftProvider('chat-test-1'));
      expect(draftState.newMessageText, isEmpty);
      expect(draftState.files, isEmpty);
    });

    testWidgets('Left button cancel button cancels voice recording', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: Column(
                children: [
                  Spacer(),
                  ChatBottomBar(chatUUID: 'chat-test-1'),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Set recording state
      container.read(voiceRecorderProvider('chat-test-1').notifier).state =
          const VoiceRecorderState(
        isRecording: true,
        isPaused: false,
        duration: Duration(seconds: 2),
      );
      await tester.pump();

      // Tap left cancel button
      await tester.tap(find.byType(LeftButtonBottomBar));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Recording state should be reset
      final recState = container.read(voiceRecorderProvider('chat-test-1'));
      expect(recState.isRecording, isFalse);
    });

    testWidgets('Middle bar pause/resume and draft actions', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: Column(
                children: [
                  Spacer(),
                  ChatBottomBar(chatUUID: 'chat-test-1'),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Set recording state
      container.read(voiceRecorderProvider('chat-test-1').notifier).state =
          const VoiceRecorderState(
        isRecording: true,
        isPaused: false,
        duration: Duration(seconds: 4),
      );
      await tester.pump();

      // Verify pause icon tooltip
      expect(find.byTooltip('Pause'), findsOneWidget);
      expect(find.byTooltip('Add to draft'), findsOneWidget);

      // Toggle pause state
      container.read(voiceRecorderProvider('chat-test-1').notifier).state =
          const VoiceRecorderState(
        isRecording: true,
        isPaused: true,
        duration: Duration(seconds: 4),
      );
      await tester.pump();

      expect(find.byTooltip('Resume'), findsOneWidget);
    });

    testWidgets('ChatDropZone wraps children correctly', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: ChatDropZone(
                chatUUID: 'chat-test-1',
                child: Text('Chat Content Area'),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ChatDropZone), findsOneWidget);
      expect(find.text('Chat Content Area'), findsOneWidget);
    });

    testWidgets('Keyboard inserted content (sticker/GIF) sends directly to queue', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: Column(
                children: [
                  Spacer(),
                  ChatBottomBar(chatUUID: 'chat-test-1'),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.contentInsertionConfiguration, isNotNull);
      expect(
        textField.contentInsertionConfiguration!.allowedMimeTypes,
        contains('image/png'),
      );

      // Simulate content insertion (pasting a sticker/image)
      final dummyBytes = Uint8List.fromList([1, 2, 3, 4, 5]);
      final content = KeyboardInsertedContent(
        mimeType: 'image/png',
        uri: 'content://media/external/images/media/123',
        data: dummyBytes,
      );

      textField.contentInsertionConfiguration!.onContentInserted(content);
      await tester.pumpAndSettle();

      // Draft must remain empty (sent directly to chat queue)
      final draftState = container.read(chatDraftProvider('chat-test-1'));
      expect(draftState.files.isEmpty, isTrue);

      final queueManager = container.read(queueManagerProvider);
      final p = queueManager.getProcessor('chat-test-1');
      expect(p, isNotNull);
    });

    testWidgets('ChatDropZone contains DropTarget for entire chat view', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('en'),
            home: Scaffold(
              body: ChatDropZone(
                chatUUID: 'chat-test-drop',
                child: Column(
                  children: [
                    Spacer(),
                    ChatBottomBar(chatUUID: 'chat-test-drop'),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final dropZone = find.byType(ChatDropZone);
      expect(dropZone, findsOneWidget);

      final dropRegionInDropZone = find.descendant(
        of: dropZone,
        matching: find.byType(DropRegion),
      );
      expect(dropRegionInDropZone, findsOneWidget);
    });
  });
}
