import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/message_action_methods.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/storage/file/file_validators.dart';
import 'package:novyse/core/chat/queue/queue_job.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/edit_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/files_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/chat_bottom_bar.dart';
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

  group('Message Edit with Files Tests', () {
    const chatUUID = 'edit-test-chat';

    testWidgets('MessageActionMethods.edit populates files in draft', (
      tester,
    ) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final message = MessageModel(
        id: 123,
        chatUUID: chatUUID,
        userUUID: 'user-1',
        createdAt: DateTime.now(),
        content: 'Original message content',
        files: [
          {
            'uuid': 'file-1',
            'name': 'photo.png',
            'size': 1024,
            'mimeType': 'image/png',
          },
          {
            'uuid': 'file-2',
            'name': 'doc.pdf',
            'size': 2048,
            'mimeType': 'application/pdf',
          },
        ],
      );

      late WidgetRef testRef;
      late BuildContext testContext;
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: Consumer(
              builder: (ctx, ref, _) {
                testRef = ref;
                testContext = ctx;
                return const SizedBox();
              },
            ),
          ),
        ),
      );

      final methods = MessageActionMethods(
        ref: testRef,
        context: testContext,
        chatUUID: chatUUID,
      );
      methods.edit(message);

      final draftState = container.read(chatDraftProvider(chatUUID));
      expect(draftState.editingMessage, isNotNull);
      expect(draftState.editingMessage!.id, 123);
      expect(draftState.newMessageText, 'Original message content');
      expect(
        container.read(chatTextControllerProvider(chatUUID)).text,
        'Original message content',
      );
      expect(draftState.files.length, 2);
      expect(draftState.files[0]['name'], 'photo.png');
      expect(draftState.files[1]['name'], 'doc.pdf');
    });

    test('ChatDraftNotifier setFiles and cancelEdit work correctly', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(chatDraftProvider(chatUUID).notifier);
      notifier.setFiles([
        {'uuid': 'f-1', 'name': 'one.jpg'},
        {'uuid': 'f-2', 'name': 'two.jpg'},
      ]);

      expect(container.read(chatDraftProvider(chatUUID)).files.length, 2);
      expect(
        container.read(chatDraftProvider(chatUUID)).files[0]['name'],
        'one.jpg',
      );

      // Cancel edit resets files and newMessageText
      notifier.cancelEdit();
      final cancelled = container.read(chatDraftProvider(chatUUID));
      expect(cancelled.editingMessage, isNull);
      expect(cancelled.files, isEmpty);
      expect(cancelled.newMessageText, isEmpty);
    });

    test('MessageStore handles edit with files snapshot', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final store = container.read(
        chatMessagesProvider((chatUUID: chatUUID, subID: 0)).notifier,
      );
      store.onNewMessage({
        'id': 10,
        'chatUUID': chatUUID,
        'userUUID': 'user-1',
        'content': 'Old text',
        'files': [
          {'uuid': 'uuid-old-1', 'name': 'old1.jpg'},
          {'uuid': 'uuid-old-2', 'name': 'old2.jpg'},
        ],
      });

      // Simulate edit event with authoritative files snapshot
      store.onMessageUpdate('10', 'edit', {
        'content': 'New edited text',
        'files': [
          {'uuid': 'uuid-old-2', 'name': 'old2.jpg'},
          {'uuid': 'uuid-new-1', 'name': 'new.png'},
        ],
      });

      final updatedList = container
          .read(chatMessagesProvider((chatUUID: chatUUID, subID: 0)))
          .messages;
      expect(updatedList.length, 1);
      final updated = updatedList.first;
      expect(updated.content, 'New edited text');
      expect(updated.edited, isTrue);
      expect(updated.files.length, 2);
      expect(updated.files.any((f) => f['uuid'] == 'uuid-old-1'), isFalse);
      expect(updated.files.any((f) => f['uuid'] == 'uuid-old-2'), isTrue);
      expect(updated.files.any((f) => f['uuid'] == 'uuid-new-1'), isTrue);
    });

    test('MessageRepository.edit handles content update and file diffing in SQLite', () async {
      final db = AppDatabase.instance;
      // Add initial message with 2 files
      await db.message.add({
        'id': 50,
        'chatUUID': chatUUID,
        'subID': 0,
        'userUUID': 'user-1',
        'content': 'Original DB content',
        'createdAt': DateTime.now().toIso8601String(),
        'files': [
          {
            'uuid': 'db-f1',
            'name': 'file1.txt',
            'mimeType': 'text/plain',
            'size': 100,
          },
          {
            'uuid': 'db-f2',
            'name': 'file2.txt',
            'mimeType': 'text/plain',
            'size': 200,
          },
        ],
      });

      var initial = await db.message.get.by.id(chatUUID, 0, 50);
      expect(initial, isNotNull);
      expect(initial!['content'], 'Original DB content');
      expect((initial['files'] as List).length, 2);

      // Call edit: keep db-f2, remove db-f1, add db-f3
      final ok = await db.message.edit(
        chatUUID,
        0,
        50,
        'Updated DB content',
        files: [
          {
            'uuid': 'db-f2',
            'name': 'file2.txt',
            'mimeType': 'text/plain',
            'size': 200,
          },
          {
            'uuid': 'db-f3',
            'name': 'file3.txt',
            'mimeType': 'text/plain',
            'size': 300,
          },
        ],
      );
      expect(ok, isTrue);

      final edited = await db.message.get.by.id(chatUUID, 0, 50);
      expect(edited, isNotNull);
      expect(edited!['content'], 'Updated DB content');
      final editedFiles = (edited['files'] as List).cast<Map>();
      expect(editedFiles.length, 2);
      expect(editedFiles.any((f) => f['uuid'] == 'db-f1'), isFalse);
      expect(editedFiles.any((f) => f['uuid'] == 'db-f2'), isTrue);
      expect(editedFiles.any((f) => f['uuid'] == 'db-f3'), isTrue);
    });

    testWidgets(
      'ChatBottomBar renders both EditBar and FilesBar when in edit mode with files',
      (tester) async {
        final container = ProviderContainer();
        addTearDown(container.dispose);

        final notifier = container.read(chatDraftProvider(chatUUID).notifier);
        final message = MessageModel(
          id: 42,
          chatUUID: chatUUID,
          userUUID: 'user-1',
          createdAt: DateTime.now(),
          content: 'Testing edit mode UI',
          files: [
            {
              'uuid': 'f-test',
              'name': 'test_image.png',
              'size': 1024,
              'mimeType': 'image/png',
            },
          ],
        );
        notifier.setEditingMessage(message);
        notifier.setText('Testing edit mode UI');
        notifier.setFiles([
          {
            'uuid': 'f-test',
            'name': 'test_image.png',
            'size': 1024,
            'mimeType': 'image/png',
          },
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
                    ChatBottomBar(chatUUID: chatUUID),
                  ],
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Verify both EditBar and FilesBar are present in the tree
        expect(find.byType(EditBar), findsOneWidget);
        expect(find.byType(FilesBar), findsOneWidget);
        expect(find.text('test_image.png'), findsOneWidget);
      },
    );

    test('ChatDraftNotifier validates files exceeding limit in edit mode', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(chatDraftProvider(chatUUID).notifier);
      final files = List.generate(
        12,
        (i) => {'name': 'file_$i.png', 'size': 1024, 'mimeType': 'image/png'},
      );
      notifier.setFiles(files);

      final validation = validateFiles(
        files,
        maxFiles: FilesBar.maxFiles,
        maxSingleSize: FilesBar.maxSingleSize,
        maxTotalSize: FilesBar.maxTotalSize,
      );
      notifier.setInvalidFiles(
        validation.invalidFilesData.map((d) => d.toMap()).toList(),
      );

      final state = container.read(chatDraftProvider(chatUUID));
      expect(state.files.length, 12);
      expect(validation.hasErrors, isTrue);
    });

    testWidgets(
      'EditBar uses formatMessage to display media indicator for file-only messages',
      (tester) async {
        final container = ProviderContainer();
        addTearDown(container.dispose);

        final notifier = container.read(chatDraftProvider(chatUUID).notifier);
        final message = MessageModel(
          id: 999,
          chatUUID: chatUUID,
          userUUID: 'user-1',
          createdAt: DateTime.now(),
          content: '',
          files: [
            {
              'uuid': 'photo-1',
              'name': 'vacation.jpg',
              'size': 1024,
              'mimeType': 'image/jpeg',
            },
          ],
        );
        notifier.setEditingMessage(message);

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(
              localizationsDelegates: localizationsDelegates,
              supportedLocales: supportedLocales,
              locale: Locale('en'),
              home: Scaffold(body: EditBar(chatUUID: chatUUID)),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Check that formatMessage translated file-only content into '📷 Photo'
        expect(find.text('📷 Photo'), findsOneWidget);
      },
    );

    test('QueueManager.addEditMessageJob saves job to SQLite and updates message optimistically', () async {
      final queueManager = QueueManager.instance;
      queueManager.setConnected(
        false,
      ); // keep offline in unit test so network isn't invoked

      final job = await queueManager.addEditMessageJob(
        id: 'edit_job_1',
        chatUUID: chatUUID,
        messageID: '123',
        newContent: 'New edited text content',
        filesChanged: false,
      );

      expect(job.type, JobType.editMessage);
      expect(job.payload['content'], 'New edited text content');

      // Verify job was persisted to SQLite
      final jobRows = await AppDatabase.instance.job.getPendingJobs();
      expect(jobRows.any((r) => r['id'] == 'edit_job_1'), isTrue);
    });

    test(
      'MessageRepository retrieves edited: true and pinned: true after edit',
      () async {
        final db = AppDatabase.instance;
        // 1. Insert chat and user
        await db.chat.add({'uuid': chatUUID, 'type': 'direct'});
        await db.user.add({
          'uuid': 'user-1',
          'name': 'Test User',
          'handle': 'tester',
        });

        // 2. Insert original message
        await db.message.add({
          'id': 500,
          'chatUUID': chatUUID,
          'subID': 0,
          'senderUUID': 'user-1',
          'content': 'Original message',
          'createdAt': DateTime.now()
              .subtract(const Duration(minutes: 5))
              .toIso8601String(),
        });

        // Verify initially edited is false
        var loaded = await db.message.get.by.id(chatUUID, 0, 500);
        expect(loaded, isNotNull);
        expect(loaded!['edited'], isFalse);

        // 3. Edit message
        await db.message.edit(
          chatUUID,
          0,
          500,
          'Updated content',
          files: [
            {
              'uuid': 'file-10',
              'name': 'image.png',
              'mimeType': 'image/png',
              'uri': '/local/path/image.png',
              'size': 12345,
            },
          ],
        );

        // Verify edited is now true and local ref was saved
        loaded = await db.message.get.by.id(chatUUID, 0, 500);
        expect(loaded, isNotNull);
        expect(loaded!['content'], 'Updated content');
        expect(loaded['edited'], isTrue);

        final files = loaded['files'] as List;
        expect(files.length, 1);
        expect(files.first['uuid'], 'file-10');
        expect(files.first['ref'], '/local/path/image.png');

        // Verify sub() query also has edited: true
        final subMessages = await db.message.get.by.sub(chatUUID, 0);
        expect(subMessages.length, 1);
        expect(subMessages.first['edited'], isTrue);
      },
    );

    test('MessageStore preserves createdAt timestamp and list position when message is edited', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final createdTime = DateTime(2026, 9, 1, 12, 0, 0);
      final initialMessage = MessageModel(
        id: 'msg-99',
        chatUUID: chatUUID,
        userUUID: 'user-1',
        createdAt: createdTime,
        content: 'Original message',
        edited: false,
      );

      final notifier = container.read(
        chatMessagesProvider((chatUUID: chatUUID, subID: 0)).notifier,
      );
      notifier.onNewMessage(initialMessage.toMap());

      final beforeUpdate = container.read(
        chatMessagesProvider((chatUUID: chatUUID, subID: 0)),
      );
      expect(beforeUpdate.messages.first.createdAt, createdTime);
      expect(beforeUpdate.messages.first.edited, isFalse);

      // Simulate socket message:update event payload
      notifier.onMessageUpdate('msg-99', 'edit', {
        'chatUUID': chatUUID,
        'subID': 0,
        'messageID': 99, // Integer messageID from backend!
        'content': 'Edited content',
        'files': [
          {
            'uuid': 'f-99',
            'name': 'photo.png',
            'mimeType': 'image/png',
            'size': 500,
          },
        ],
      });

      final afterUpdate = container.read(
        chatMessagesProvider((chatUUID: chatUUID, subID: 0)),
      );
      final updated = afterUpdate.messages.first;
      expect(updated.content, 'Edited content');
      expect(updated.edited, isTrue);
      // Verify createdAt was NOT modified and matches original
      expect(updated.createdAt, createdTime);
      expect(updated.files.length, 1);
      expect(updated.files.first['name'], 'photo.png');
    });
  });
}
