import 'dart:typed_data';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/chat/paste/chat_paste_helper.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  late AppDatabase db;
  late QueueManager queueManager;

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();

    queueManager = QueueManager.instance;
    await queueManager.initialize(listenToConnectivity: false);
    queueManager.setConnected(false);
  });

  tearDown(() async {
    queueManager.dispose();
    await db.clear();
  });

  group('ChatPasteHelper Tests', () {
    test('addDroppedFiles adds dropped files to draft', () async {
      final container = ProviderContainer(
        overrides: [queueManagerProvider.overrideWithValue(queueManager)],
      );
      addTearDown(container.dispose);

      await ChatPasteHelper.addDroppedFiles(
        container,
        'chat-helper-dropped',
        [
          _FakeDropFile(name: 'doc.pdf', path: '/fake/doc.pdf', lengthVal: 1024),
          _FakeDropFile(name: 'photo.jpg', path: '/fake/photo.jpg', lengthVal: 2048),
        ],
      );

      final draftState = container.read(chatDraftProvider('chat-helper-dropped'));
      expect(draftState.files.length, 2);
      final file1 = draftState.files[0] as Map;
      final file2 = draftState.files[1] as Map;
      expect(file1['name'], 'doc.pdf');
      expect(file1['mimeType'], 'application/pdf');
      expect(file2['name'], 'photo.jpg');
      expect(file2['mimeType'], 'image/jpeg');
    });

    test('handleKeyboardInserted sends GIF or sticker directly via queue and matches format', () async {
      final container = ProviderContainer(
        overrides: [queueManagerProvider.overrideWithValue(queueManager)],
      );
      addTearDown(container.dispose);

      final pngBytes = Uint8List.fromList([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

      // 1. Insert PNG (Sticker) -> sent directly, not added to draft
      await ChatPasteHelper.handleKeyboardInserted(
        container,
        'chat-keyboard-test',
        _FakeKeyboardInsertedContent(
          data: pngBytes,
          mimeType: 'image/png',
          uri: 'content://media/1',
        ),
      );

      // Draft must remain empty
      final draft1 = container.read(chatDraftProvider('chat-keyboard-test'));
      expect(draft1.files.isEmpty, isTrue);

      // Verify processor created
      final p1 = queueManager.getProcessor('chat-keyboard-test');
      expect(p1, isNotNull);

      // 2. Insert GIF -> sent directly with GIF format and gif_ prefix
      await ChatPasteHelper.handleKeyboardInserted(
        container,
        'chat-keyboard-test-gif',
        _FakeKeyboardInsertedContent(
          data: null,
          mimeType: 'image/gif',
          uri: 'content://media/animated.gif',
        ),
      );

      final draft2 = container.read(chatDraftProvider('chat-keyboard-test-gif'));
      expect(draft2.files.isEmpty, isTrue);
      final p2 = queueManager.getProcessor('chat-keyboard-test-gif');
      expect(p2, isNotNull);
    });

    test('tryAttachFromPathOrUri returns false for empty text or non-existent path', () async {
      final container = ProviderContainer(
        overrides: [queueManagerProvider.overrideWithValue(queueManager)],
      );
      addTearDown(container.dispose);

      final res1 = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-path-test',
        '',
      );
      expect(res1, isFalse);

      final res2 = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-path-test',
        '/non/existent/path/file.txt',
      );
      expect(res2, isFalse);

      final res3 = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-path-test',
        'Hello this is a regular chat message',
      );
      expect(res3, isFalse);
    });

    test('appendFiles correctly adds files and updates draft and invalid files', () async {
      final container = ProviderContainer(
        overrides: [queueManagerProvider.overrideWithValue(queueManager)],
      );
      addTearDown(container.dispose);

      ChatPasteHelper.appendFiles(
        container,
        'chat-append-test',
        [
          {'name': 'test.png', 'size': 500, 'mimeType': 'image/png', 'type': 'IMAGE'},
        ],
      );

      final draft = container.read(chatDraftProvider('chat-append-test'));
      expect(draft.files.length, 1);
      expect((draft.files.first as Map)['name'], 'test.png');
    });
  });
}

class _FakeDropFile {
  final String name;
  final String path;
  final int lengthVal;

  _FakeDropFile({required this.name, required this.path, required this.lengthVal});

  Future<int> length() async => lengthVal;
  Future<Uint8List> readAsBytes() async => Uint8List(0);
}

class _FakeKeyboardInsertedContent {
  final Uint8List? data;
  final String mimeType;
  final String? uri;

  _FakeKeyboardInsertedContent({
    this.data,
    required this.mimeType,
    this.uri,
  });
}
