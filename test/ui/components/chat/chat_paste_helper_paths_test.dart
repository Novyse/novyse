import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/chat/paste/chat_paste_helper.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Complements `chat_paste_helper_test.dart` with the paste paths that suite
/// does not reach: quoted/file-uri path parsing, the dropped-file metadata
/// fallbacks, the focused-field text insertion and `appendFiles` validation.
class _FakeDropFile {
  _FakeDropFile({
    required this.name,
    this.path,
    this.lengthVal = 0,
    this.bytes,
  });

  final String name;
  final String? path;
  final int lengthVal;
  final Uint8List? bytes;

  Future<int> length() async => lengthVal;

  Future<Uint8List> readAsBytes() async => bytes ?? Uint8List(0);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase db;
  late QueueManager queueManager;
  late ProviderContainer container;
  late Directory tempDir;

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();

    queueManager = QueueManager.instance;
    await queueManager.initialize(listenToConnectivity: false);
    queueManager.setConnected(false);

    container = ProviderContainer();
    tempDir = Directory.systemTemp.createTempSync('paste_helper_test');
  });

  tearDown(() async {
    container.dispose();
    queueManager.dispose();
    await db.clear();
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  /// Writes [bytes] into the temp dir and returns the full path.
  String writeTemp(String name, [List<int>? bytes]) {
    final file = File('${tempDir.path}/$name');
    file.writeAsBytesSync(bytes ?? [1, 2, 3, 4]);
    return file.path;
  }

  /// The files currently on the draft for [chatUUID].
  List<dynamic> draftFiles(String chatUUID) =>
      container.read(chatDraftProvider(chatUUID)).files;

  group('tryAttachFromPathOrUri', () {
    test('attaches a bare existing path', () async {
      final path = writeTemp('a.png');

      final ok = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-1',
        path,
      );

      expect(ok, isTrue);
      final file = draftFiles('chat-1').single as Map;
      expect(file['name'], 'a.png');
      expect(file['path'], path);
      expect(file['size'], 4);
      expect(file['mimeType'], 'image/png');
    });

    test('attaches a file:// uri', () async {
      final path = writeTemp('b.pdf');

      final ok = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-1',
        'file://$path',
      );

      expect(ok, isTrue);
      expect((draftFiles('chat-1').single as Map)['name'], 'b.pdf');
    });

    test('strips double quotes around a path', () async {
      final path = writeTemp('c.txt');

      final ok = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-1',
        '"$path"',
      );

      expect(ok, isTrue);
      expect((draftFiles('chat-1').single as Map)['name'], 'c.txt');
    });

    test('strips single quotes around a path', () async {
      final path = writeTemp('d.txt');

      final ok = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-1',
        "'$path'",
      );

      expect(ok, isTrue);
    });

    test('attaches several newline-separated paths', () async {
      final a = writeTemp('a.png');
      final b = writeTemp('b.png');

      final ok = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-1',
        '$a\n$b',
      );

      expect(ok, isTrue);
      expect(draftFiles('chat-1'), hasLength(2));
    });

    test('attaches carriage-return separated paths', () async {
      final a = writeTemp('a.png');
      final b = writeTemp('b.png');

      final ok = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-1',
        '$a\r\n$b',
      );

      expect(ok, isTrue);
      expect(draftFiles('chat-1'), hasLength(2));
    });

    test('ignores blank lines between paths', () async {
      final a = writeTemp('a.png');
      final b = writeTemp('b.png');

      final ok = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-1',
        '$a\n\n   \n$b',
      );

      expect(ok, isTrue);
      expect(draftFiles('chat-1'), hasLength(2));
    });

    test('refuses when only some lines are real files', () async {
      final a = writeTemp('a.png');

      final ok = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-1',
        '$a\n/tmp/definitely-missing-file.png',
      );

      expect(ok, isFalse);
      expect(draftFiles('chat-1'), isEmpty);
    });

    test('refuses a directory', () async {
      final ok = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-1',
        tempDir.path,
      );

      expect(ok, isFalse);
      expect(draftFiles('chat-1'), isEmpty);
    });

    test('refuses an empty or whitespace-only paste', () async {
      expect(
        await ChatPasteHelper.tryAttachFromPathOrUri(container, 'c', '   '),
        isFalse,
      );
      expect(
        await ChatPasteHelper.tryAttachFromPathOrUri(container, 'c', '\n\n'),
        isFalse,
      );
    });

    test('refuses plain prose', () async {
      expect(
        await ChatPasteHelper.tryAttachFromPathOrUri(
          container,
          'chat-1',
          'just some text',
        ),
        isFalse,
      );
    });

    test('resolves the mime from the bytes when the name has none', () async {
      final path = writeTemp('noext');

      final ok = await ChatPasteHelper.tryAttachFromPathOrUri(
        container,
        'chat-1',
        path,
      );

      expect(ok, isTrue);
      expect((draftFiles('chat-1').single as Map)['mimeType'], defaultMimeType);
    });
  });

  group('addDroppedFiles', () {
    test('resolves the mime from the name and a real path', () async {
      final path = writeTemp('a.png');

      await ChatPasteHelper.addDroppedFiles(container, 'chat-1', [
        _FakeDropFile(name: 'a.png', path: path, lengthVal: 4),
      ]);

      final file = draftFiles('chat-1').single as Map;
      expect(file['name'], 'a.png');
      expect(file['path'], path);
      expect(file['uri'], path);
      expect(file['size'], 4);
      expect(file['mimeType'], 'image/png');
      // A non-zero size means no byte read was needed.
      expect(file['bytes'], isNull);
    });

    test('falls back to the on-disk size when the drop reports zero', () async {
      final path = writeTemp('b.png');

      await ChatPasteHelper.addDroppedFiles(container, 'chat-1', [
        _FakeDropFile(name: 'b.png', path: path, lengthVal: 0),
      ]);

      expect((draftFiles('chat-1').single as Map)['size'], 4);
    });

    test('reads bytes when there is no path', () async {
      await ChatPasteHelper.addDroppedFiles(container, 'chat-1', [
        _FakeDropFile(name: 'c.gif', bytes: Uint8List.fromList([9, 9, 9])),
      ]);

      final file = draftFiles('chat-1').single as Map;
      expect(file['bytes'], hasLength(3));
      expect(file['size'], 3);
      // With no path the uri falls back to the name.
      expect(file['uri'], 'c.gif');
      expect(file['mimeType'], 'image/gif');
    });

    test('sniffs the mime from the bytes', () async {
      await ChatPasteHelper.addDroppedFiles(container, 'chat-1', [
        _FakeDropFile(
          name: 'unknown',
          bytes: Uint8List.fromList([
            0x89,
            0x50,
            0x4E,
            0x47,
            0x0D,
            0x0A,
            0x1A,
            0x0A,
          ]),
        ),
      ]);

      expect((draftFiles('chat-1').single as Map)['mimeType'], 'image/png');
    });

    test('resolves the mime from the name when there are no bytes', () async {
      await ChatPasteHelper.addDroppedFiles(container, 'chat-1', [
        _FakeDropFile(name: 'doc.pdf'),
      ]);

      expect(
        (draftFiles('chat-1').single as Map)['mimeType'],
        'application/pdf',
      );
    });

    test('appends to the existing draft files', () async {
      final path = writeTemp('a.png');
      await ChatPasteHelper.addDroppedFiles(container, 'chat-1', [
        _FakeDropFile(name: 'a.png', path: path, lengthVal: 4),
      ]);
      await ChatPasteHelper.addDroppedFiles(container, 'chat-1', [
        _FakeDropFile(name: 'b.png', path: writeTemp('b.png'), lengthVal: 4),
      ]);

      expect(draftFiles('chat-1'), hasLength(2));
    });

    test('is a no-op for an empty drop', () async {
      await ChatPasteHelper.addDroppedFiles(container, 'chat-1', []);

      expect(draftFiles('chat-1'), isEmpty);
    });

    test('falls back to a default name when the name getter throws', () async {
      await ChatPasteHelper.addDroppedFiles(container, 'chat-1', [
        _ThrowingNameDropFile(),
        _FakeDropFile(name: 'ok.png', path: writeTemp('ok.png'), lengthVal: 4),
      ]);

      // The bad entry is still attached, but with the `file` fallback name.
      final files = draftFiles('chat-1');
      expect(files, hasLength(2));
      expect((files.first as Map)['name'], 'file');
      expect((files.last as Map)['name'], 'ok.png');
    });
  });

  group('appendFiles', () {
    test('adds the files to an empty draft', () {
      ChatPasteHelper.appendFiles(container, 'chat-1', [
        {'name': 'a.png', 'size': 10},
      ]);

      expect(draftFiles('chat-1'), hasLength(1));
    });

    test('keeps the files already on the draft', () {
      ChatPasteHelper.appendFiles(container, 'chat-1', [
        {'name': 'a.png', 'size': 10},
      ]);
      ChatPasteHelper.appendFiles(container, 'chat-1', [
        {'name': 'b.png', 'size': 10},
      ]);

      expect(draftFiles('chat-1'), hasLength(2));
    });

    test('marks an oversized file invalid', () {
      ChatPasteHelper.appendFiles(container, 'chat-1', [
        {'name': 'huge.bin', 'size': 10 * 1024 * 1024 * 1024},
      ]);

      // The validator reports offending indexes, not names.
      expect(
        container
            .read(chatDraftProvider('chat-1'))
            .invalidFiles
            .map((f) => f['index']),
        [0],
      );
    });

    test('keeps only the invalid files flagged', () {
      ChatPasteHelper.appendFiles(container, 'chat-1', [
        {'name': 'fine.png', 'size': 10},
        {'name': 'huge.bin', 'size': 10 * 1024 * 1024 * 1024},
      ]);

      expect(draftFiles('chat-1'), hasLength(2));
      expect(
        container
            .read(chatDraftProvider('chat-1'))
            .invalidFiles
            .map((f) => f['index']),
        [1],
      );
    });

    test('re-validating a clean draft clears the invalid list', () {
      ChatPasteHelper.appendFiles(container, 'chat-1', [
        {'name': 'huge.bin', 'size': 10 * 1024 * 1024 * 1024},
      ]);
      expect(
        container.read(chatDraftProvider('chat-1')).invalidFiles,
        isNotEmpty,
      );

      // Re-validating an empty list leaves nothing flagged.
      ChatPasteHelper.appendFiles(container, 'chat-2', const []);
      expect(container.read(chatDraftProvider('chat-2')).invalidFiles, isEmpty);
    });
  });

  group('pasteTextIntoFocusedField', () {
    /// Builds a text field with a controller and focuses it.
    Future<TextEditingController> pumpField(
      WidgetTester tester, {
      String text = '',
      TextSelection? selection,
    }) async {
      final controller = TextEditingController(text: text)
        ..selection = selection ?? TextSelection.collapsed(offset: text.length);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TextField(controller: controller, autofocus: true),
          ),
        ),
      );
      await tester.pumpAndSettle();
      return controller;
    }

    testWidgets('inserts at the caret', (tester) async {
      final controller = await pumpField(
        tester,
        text: 'hello world',
        selection: const TextSelection.collapsed(offset: 5),
      );

      ChatPasteHelper.pasteTextIntoFocusedField(',');
      await tester.pump();

      expect(controller.text, 'hello, world');
      expect(controller.selection.baseOffset, 6);
    });

    testWidgets('replaces the current selection', (tester) async {
      final controller = await pumpField(
        tester,
        text: 'hello world',
        selection: const TextSelection(baseOffset: 0, extentOffset: 5),
      );

      ChatPasteHelper.pasteTextIntoFocusedField('bye');
      await tester.pump();

      expect(controller.text, 'bye world');
    });

    testWidgets('appends to an empty field', (tester) async {
      final controller = await pumpField(tester);

      ChatPasteHelper.pasteTextIntoFocusedField('new');
      await tester.pump();

      expect(controller.text, 'new');
    });

    testWidgets('inserts at the caret, which defaults to the end', (
      tester,
    ) async {
      final controller = await pumpField(tester, text: 'abc');

      ChatPasteHelper.pasteTextIntoFocusedField('xyz');
      await tester.pump();

      expect(controller.text, 'abcxyz');
    });

    testWidgets('is a no-op when nothing is focused', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: Scaffold()));
      await tester.pumpAndSettle();

      expect(
        () => ChatPasteHelper.pasteTextIntoFocusedField('text'),
        returnsNormally,
      );
    });

    testWidgets('handles a multi-line paste', (tester) async {
      final controller = await pumpField(tester, text: 'x');

      ChatPasteHelper.pasteTextIntoFocusedField('\nnew line');
      await tester.pump();

      expect(controller.text, 'x\nnew line');
    });
  });
  group('with a WidgetRef', () {
    /// Runs [action] with a live `WidgetRef` harvested from a `Consumer`, which
    /// is the only way to reach the widget branches of `appendFiles`,
    /// `addDroppedFiles` and `handleKeyboardInserted`.
    Future<void> withWidgetRef(
      WidgetTester tester,
      Future<void> Function(WidgetRef ref) action,
    ) async {
      // UncontrolledProviderScope points the widget at the very container the
      // assertions read from.
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: Scaffold(
              body: Consumer(
                builder: (context, ref, _) {
                  return TextButton(
                    onPressed: () => action(ref),
                    child: const Text('run'),
                  );
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('run'));
      await tester.pumpAndSettle();
    }

    testWidgets('appendFiles writes through the WidgetRef branch', (
      tester,
    ) async {
      await withWidgetRef(tester, (ref) async {
        ChatPasteHelper.appendFiles(ref, 'chat-w', [
          {'name': 'a.png', 'size': 10},
        ]);
      });

      expect(draftFiles('chat-w'), hasLength(1));
    });

    testWidgets('appendFiles flags an oversized file through WidgetRef', (
      tester,
    ) async {
      await withWidgetRef(tester, (ref) async {
        ChatPasteHelper.appendFiles(ref, 'chat-w', [
          {'name': 'huge.bin', 'size': 10 * 1024 * 1024 * 1024},
        ]);
      });

      expect(
        container
            .read(chatDraftProvider('chat-w'))
            .invalidFiles
            .map((f) => f['index']),
        [0],
      );
    });

    testWidgets('addDroppedFiles attaches through the WidgetRef branch', (
      tester,
    ) async {
      final path = writeTemp('drop.png');

      await withWidgetRef(tester, (ref) async {
        await ChatPasteHelper.addDroppedFiles(ref, 'chat-w', [
          _FakeDropFile(name: 'drop.png', path: path, lengthVal: 4),
        ]);
      });

      expect((draftFiles('chat-w').single as Map)['mimeType'], 'image/png');
    });
  });
}

/// A drop file whose `name` getter throws, to exercise the defensive path.
class _ThrowingNameDropFile {
  String get name => throw StateError('no name');

  String? get path => null;

  Future<int> length() async => 0;

  Future<Uint8List> readAsBytes() async => Uint8List(0);
}
