import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/message_action_methods.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/forward_store.dart';
import 'package:novyse/core/stores/message_store.dart';

/// `MessageActionMethods` needs a `WidgetRef` and a `BuildContext`, so the
/// harness harvests a real one from a `Consumer` and shares the test container
/// with it. That reaches the draft/forward/selection state transitions and the
/// quote-range arithmetic, which are the parts with real logic.
void main() {
  late ProviderContainer container;

  MessageModel message({
    int id = 1,
    String chatUUID = 'chat-1',
    int subID = 0,
    String? content = 'hello world',
    List<Map<String, dynamic>> files = const [],
  }) => MessageModel(
    id: id,
    chatUUID: chatUUID,
    subID: subID,
    userUUID: 'u1',
    content: content,
    type: 'message',
    files: files,
    createdAt: DateTime(2026, 1, 1),
  );

  setUp(() => container = ProviderContainer());

  tearDown(() => container.dispose());

  /// Builds the methods object with a live `WidgetRef`/`BuildContext`.
  Future<MessageActionMethods> build(
    WidgetTester tester, {
    String chatUUID = 'chat-1',
    int subID = 0,
  }) async {
    late MessageActionMethods methods;
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: Consumer(
              builder: (context, ref, _) {
                methods = MessageActionMethods(
                  ref: ref,
                  context: context,
                  chatUUID: chatUUID,
                  subID: subID,
                );
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return methods;
  }

  // ignore: unnecessary_cast
  ChatReplyItem? replyItem(String chatUUID) {
    final replies = container.read(chatDraftProvider(chatUUID)).replyingTo;
    return replies.isEmpty ? null : replies.first;
  }

  group('reply', () {
    testWidgets('adds the message to the draft reply list', (tester) async {
      final methods = await build(tester);

      methods.reply(message());

      expect(replyItem('chat-1')!.message.id, 1);
    });

    testWidgets('appends to an existing reply list', (tester) async {
      final methods = await build(tester);

      methods.reply(message(id: 1));
      methods.reply(message(id: 2));

      expect(
        container.read(chatDraftProvider('chat-1')).replyingTo,
        hasLength(2),
      );
    });

    testWidgets('replying the same message twice does not duplicate it', (
      tester,
    ) async {
      final methods = await build(tester);

      methods.reply(message(id: 1));
      methods.reply(message(id: 1));

      expect(
        container.read(chatDraftProvider('chat-1')).replyingTo,
        hasLength(1),
      );
    });

    testWidgets('targets the requested chat', (tester) async {
      final methods = await build(tester, chatUUID: 'chat-9');

      methods.reply(message(chatUUID: 'chat-9'));

      expect(replyItem('chat-9'), isNotNull);
      expect(replyItem('chat-1'), isNull);
    });
  });

  group('quoteAndReply', () {
    testWidgets('records the quoted range', (tester) async {
      final methods = await build(tester);

      methods.quoteAndReply(message(content: 'hello world'), 'world');

      final item = replyItem('chat-1')!;
      expect(item.rangeStart, 6);
      expect(item.rangeEnd, 11);
    });

    testWidgets('trims the selection before locating it', (tester) async {
      final methods = await build(tester);

      methods.quoteAndReply(message(content: 'hello world'), '  world  ');

      final item = replyItem('chat-1')!;
      expect(item.rangeStart, 6);
      expect(item.rangeEnd, 11);
    });

    testWidgets('records no range for a blank selection', (tester) async {
      final methods = await build(tester);

      methods.quoteAndReply(message(content: 'hello world'), '   ');

      final item = replyItem('chat-1')!;
      expect(item.rangeStart, isNull);
      expect(item.rangeEnd, isNull);
    });

    testWidgets('records no range when the text is not in the message', (
      tester,
    ) async {
      final methods = await build(tester);

      methods.quoteAndReply(message(content: 'hello world'), 'missing');

      expect(replyItem('chat-1')!.rangeStart, isNull);
    });

    testWidgets('records no range for a message with no content', (
      tester,
    ) async {
      final methods = await build(tester);

      methods.quoteAndReply(message(content: null), 'anything');

      final item = replyItem('chat-1')!;
      expect(item.rangeStart, isNull);
      expect(item.rangeEnd, isNull);
    });

    testWidgets('finds a selection at the very start', (tester) async {
      final methods = await build(tester);

      methods.quoteAndReply(message(content: 'hello'), 'hello');

      final item = replyItem('chat-1')!;
      expect(item.rangeStart, 0);
      expect(item.rangeEnd, 5);
    });
  });

  group('select', () {
    testWidgets('marks the message as selected', (tester) async {
      final methods = await build(tester);

      methods.select(message());

      expect(
        container.read(chatDraftProvider('chat-1')).selectedMessages,
        hasLength(1),
      );
    });

    testWidgets('toggles the selection off again', (tester) async {
      final methods = await build(tester);

      methods.select(message());
      methods.select(message());

      expect(
        container.read(chatDraftProvider('chat-1')).selectedMessages,
        isEmpty,
      );
    });

    testWidgets('accumulates several selections', (tester) async {
      final methods = await build(tester);

      methods.select(message(id: 1));
      methods.select(message(id: 2));

      expect(
        container.read(chatDraftProvider('chat-1')).selectedMessages,
        hasLength(2),
      );
    });
  });

  group('forward', () {
    testWidgets('queues the message for forwarding', (tester) async {
      final methods = await build(tester);

      methods.forward(message(id: 3));

      final forward = container.read(forwardProvider);
      expect(forward.forwardMessages.map((m) => m.id), [3]);
    });

    testWidgets('replaces a previous forward selection', (tester) async {
      final methods = await build(tester);

      methods.forward(message(id: 3));
      methods.forward(message(id: 4));

      expect(container.read(forwardProvider).forwardMessages.map((m) => m.id), [
        4,
      ]);
    });
  });

  group('edit', () {
    testWidgets('loads the content into the draft and the controller', (
      tester,
    ) async {
      final methods = await build(tester);

      methods.edit(message(content: 'edited text'));

      final draft = container.read(chatDraftProvider('chat-1'));
      expect(draft.newMessageText, 'edited text');
      expect(draft.editingMessage?.id, 1);
      expect(
        container.read(chatTextControllerProvider('chat-1')).text,
        'edited text',
      );
    });

    testWidgets('copes with a message that has no content', (tester) async {
      final methods = await build(tester);

      methods.edit(message(content: null));

      expect(container.read(chatDraftProvider('chat-1')).newMessageText, '');
    });

    testWidgets('copies the message files into the draft', (tester) async {
      final methods = await build(tester);

      methods.edit(
        message(
          files: [
            {'uuid': 'f1', 'name': 'a.png'},
          ],
        ),
      );

      final files = container.read(chatDraftProvider('chat-1')).files;
      expect(files, hasLength(1));
      expect((files.single as Map)['name'], 'a.png');
    });

    testWidgets('clears any stale invalid-file flags', (tester) async {
      final methods = await build(tester);
      container.read(chatDraftProvider('chat-1').notifier).setInvalidFiles([
        {
          'index': 0,
          'errors': ['too big'],
        },
      ]);

      methods.edit(message());

      expect(container.read(chatDraftProvider('chat-1')).invalidFiles, isEmpty);
    });

    testWidgets('reuses an already-matching controller value', (tester) async {
      final methods = await build(tester);
      methods.edit(message(content: 'same'));
      final controller = container.read(chatTextControllerProvider('chat-1'));

      methods.edit(message(content: 'same'));

      expect(
        identical(
          container.read(chatTextControllerProvider('chat-1')),
          controller,
        ),
        isTrue,
      );
    });
  });

  group('copy', () {
    /// Records every `Clipboard.setData` payload.
    late List<String?> copied;

    setUp(() {
      copied = <String?>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(SystemChannels.platform, (call) async {
            if (call.method == 'Clipboard.setData') {
              copied.add((call.arguments as Map)['text'] as String?);
            }
            return null;
          });
    });

    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(SystemChannels.platform, null);
    });

    testWidgets('writes the content to the clipboard', (tester) async {
      final methods = await build(tester);
      methods.copy(message(content: 'to copy'));

      await tester.pumpAndSettle();
      expect(copied, ['to copy']);
    });

    testWidgets('writes an empty string for a message with no content', (
      tester,
    ) async {
      final methods = await build(tester);
      methods.copy(message(content: null));

      await tester.pumpAndSettle();
      expect(copied, ['']);
    });

    testWidgets('copySelected writes the selected text', (tester) async {
      final methods = await build(tester);
      methods.copySelected('partial');

      await tester.pumpAndSettle();
      expect(copied, ['partial']);
    });
  });

  group('download', () {
    testWidgets('is not implemented', (tester) async {
      final methods = await build(tester);

      expect(
        () => methods.download(message()),
        throwsA(isA<UnimplementedError>()),
      );
    });
  });
}
