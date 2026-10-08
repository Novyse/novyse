import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:markdown_editor_live/markdown_editor_live.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/middle_bar_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/voice_recorder_controller.dart';

class _FakeUserNotifier extends UserNotifier {
  final String myUUID;
  _FakeUserNotifier(this.myUUID);
  @override
  UserStoreState build() => UserStoreState(localUserUUID: myUUID);
}

void main() {
  const testChatUUID = 'test-chat-shortcuts';
  const testSubID = 0;
  const localUUID = 'local-user-uuid';
  const remoteUUID = 'remote-user-uuid';

  Widget buildTestApp({
    required ProviderContainer container,
    required VoidCallback onSendMessage,
    required MarkdownEditingController controller,
    FocusNode? focusNode,
  }) {
    return UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        localizationsDelegates: localizationsDelegates,
        supportedLocales: supportedLocales,
        locale: const Locale('en'),
        home: Scaffold(
          body: MiddleBarBottomBar(
            chatUUID: testChatUUID,
            subID: testSubID,
            textController: controller,
            isRecording: false,
            recorderState: const VoiceRecorderState(),
            onSendMessage: onSendMessage,
            onTogglePause: () {},
            onStopAndDraft: () {},
            focusNode: focusNode,
          ),
        ),
      ),
    );
  }

  group('Chat Shortcuts - Enter and Shift+Enter', () {
    testWidgets('Enter sends message when chat.sendWithEnter is true', (tester) async {
      final container = ProviderContainer(
        overrides: [
          settingValueProvider('chat.sendWithEnter').overrideWithValue(true),
        ],
      );
      addTearDown(container.dispose);

      var sendCalled = false;
      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        buildTestApp(
          container: container,
          onSendMessage: () => sendCalled = true,
          controller: controller,
          focusNode: focusNode,
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Hello Novyse');
      focusNode.requestFocus();
      await tester.pump();

      // Press Enter
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();

      expect(sendCalled, isTrue);
    });

    testWidgets('Shift + Enter inserts newline when chat.sendWithEnter is true', (tester) async {
      final container = ProviderContainer(
        overrides: [
          settingValueProvider('chat.sendWithEnter').overrideWithValue(true),
        ],
      );
      addTearDown(container.dispose);

      var sendCalled = false;
      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        buildTestApp(
          container: container,
          onSendMessage: () => sendCalled = true,
          controller: controller,
          focusNode: focusNode,
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Line 1');
      focusNode.requestFocus();
      await tester.pump();

      // Press Shift + Enter
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      await tester.pump();

      expect(sendCalled, isFalse);
      expect(controller.text, equals('Line 1\n'));
    });

    testWidgets('Ctrl + Enter is ignored by chat shortcuts', (tester) async {
      final container = ProviderContainer(
        overrides: [
          settingValueProvider('chat.sendWithEnter').overrideWithValue(true),
        ],
      );
      addTearDown(container.dispose);

      var sendCalled = false;
      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        buildTestApp(
          container: container,
          onSendMessage: () => sendCalled = true,
          controller: controller,
          focusNode: focusNode,
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Line 1');
      focusNode.requestFocus();
      await tester.pump();

      // Press Ctrl + Enter
      await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await tester.pump();

      expect(sendCalled, isFalse);
    });

    testWidgets('Enter inserts newline when chat.sendWithEnter is false', (tester) async {
      final container = ProviderContainer(
        overrides: [
          settingValueProvider('chat.sendWithEnter').overrideWithValue(false),
        ],
      );
      addTearDown(container.dispose);

      var sendCalled = false;
      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        buildTestApp(
          container: container,
          onSendMessage: () => sendCalled = true,
          controller: controller,
          focusNode: focusNode,
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Line 1');
      focusNode.requestFocus();
      await tester.pump();

      // Press plain Enter
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();

      expect(sendCalled, isFalse);
      expect(controller.text, equals('Line 1\n'));
    });

    testWidgets('Shift + Enter inserts newline when chat.sendWithEnter is false', (tester) async {
      final container = ProviderContainer(
        overrides: [
          settingValueProvider('chat.sendWithEnter').overrideWithValue(false),
        ],
      );
      addTearDown(container.dispose);

      var sendCalled = false;
      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        buildTestApp(
          container: container,
          onSendMessage: () => sendCalled = true,
          controller: controller,
          focusNode: focusNode,
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Line 1');
      focusNode.requestFocus();
      await tester.pump();

      // Press Shift + Enter
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      await tester.pump();

      expect(sendCalled, isFalse);
      expect(controller.text, equals('Line 1\n'));
    });
  });

  group('Chat Shortcuts - Arrow UP (Edit vs Reply)', () {
    testWidgets('Arrow UP with empty input initiates EDIT if last message was sent by local user', (
      tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => _FakeUserNotifier(localUUID)),
        ],
      );
      addTearDown(container.dispose);

      // Seed a message sent by local user
      final msgNotifier = container.read(
        chatMessagesProvider((chatUUID: testChatUUID, subID: testSubID)).notifier,
      );
      msgNotifier.onNewMessage({
        'id': 101,
        'chatUUID': testChatUUID,
        'subID': testSubID,
        'senderUUID': localUUID,
        'content': 'My previous message',
        'type': 'message',
      });

      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        buildTestApp(
          container: container,
          onSendMessage: () {},
          controller: controller,
          focusNode: focusNode,
        ),
      );
      await tester.pumpAndSettle();

      // Focus empty input and press Arrow Up
      focusNode.requestFocus();
      await tester.pump();

      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await tester.pump();

      final draftState = container.read(chatDraftProvider(testChatUUID));
      expect(draftState.editingMessage, isNotNull);
      expect(draftState.editingMessage!.id, equals(101));
      expect(controller.text, equals('My previous message'));
    });

    testWidgets('Arrow UP with empty input initiates REPLY if last message was sent by other user', (
      tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => _FakeUserNotifier(localUUID)),
        ],
      );
      addTearDown(container.dispose);

      // Seed a message sent by remote user
      final msgNotifier = container.read(
        chatMessagesProvider((chatUUID: testChatUUID, subID: testSubID)).notifier,
      );
      msgNotifier.onNewMessage({
        'id': 202,
        'chatUUID': testChatUUID,
        'subID': testSubID,
        'senderUUID': remoteUUID,
        'content': 'Remote friend message',
        'type': 'message',
      });

      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        buildTestApp(
          container: container,
          onSendMessage: () {},
          controller: controller,
          focusNode: focusNode,
        ),
      );
      await tester.pumpAndSettle();

      // Focus empty input and press Arrow Up
      focusNode.requestFocus();
      await tester.pump();

      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await tester.pump();

      final draftState = container.read(chatDraftProvider(testChatUUID));
      expect(draftState.editingMessage, isNull);
      expect(draftState.replyingTo, isNotEmpty);
      expect(draftState.replyingTo.first.message.id, equals(202));
    });

    testWidgets('Arrow UP does nothing when text input is not empty', (
      tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => _FakeUserNotifier(localUUID)),
        ],
      );
      addTearDown(container.dispose);

      final msgNotifier = container.read(
        chatMessagesProvider((chatUUID: testChatUUID, subID: testSubID)).notifier,
      );
      msgNotifier.onNewMessage({
        'id': 101,
        'chatUUID': testChatUUID,
        'subID': testSubID,
        'senderUUID': localUUID,
        'content': 'My previous message',
        'type': 'message',
      });

      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        buildTestApp(
          container: container,
          onSendMessage: () {},
          controller: controller,
          focusNode: focusNode,
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'I am currently typing');
      focusNode.requestFocus();
      await tester.pump();

      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await tester.pump();

      final draftState = container.read(chatDraftProvider(testChatUUID));
      expect(draftState.editingMessage, isNull);
      expect(draftState.replyingTo, isEmpty);
      expect(controller.text, equals('I am currently typing'));
    });
  });

  group('Chat Shortcuts - Escape', () {
    testWidgets('Escape cancels message editing', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        buildTestApp(
          container: container,
          onSendMessage: () {},
          controller: controller,
          focusNode: focusNode,
        ),
      );
      await tester.pumpAndSettle();

      final message = MessageModel(
        id: 55,
        chatUUID: testChatUUID,
        userUUID: localUUID,
        createdAt: DateTime.now(),
        content: 'Editing this',
      );
      container.read(chatDraftProvider(testChatUUID).notifier).setEditingMessage(message);
      controller.text = 'Editing this';

      focusNode.requestFocus();
      await tester.pump();

      expect(container.read(chatDraftProvider(testChatUUID)).editingMessage, isNotNull);

      // Press Escape
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pump();

      expect(container.read(chatDraftProvider(testChatUUID)).editingMessage, isNull);
      expect(controller.text, isEmpty);
    });

    testWidgets('Escape clears active replies', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        buildTestApp(
          container: container,
          onSendMessage: () {},
          controller: controller,
          focusNode: focusNode,
        ),
      );
      await tester.pumpAndSettle();

      final message = MessageModel(
        id: 88,
        chatUUID: testChatUUID,
        userUUID: remoteUUID,
        createdAt: DateTime.now(),
        content: 'Replying to this',
      );
      container.read(chatDraftProvider(testChatUUID).notifier).addReply(message);

      focusNode.requestFocus();
      await tester.pump();

      expect(container.read(chatDraftProvider(testChatUUID)).replyingTo, isNotEmpty);

      // Press Escape
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pump();

      expect(container.read(chatDraftProvider(testChatUUID)).replyingTo, isEmpty);
    });

    testWidgets('Escape navigates away from chat route when not editing or replying', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final controller = container.read(chatTextControllerProvider(testChatUUID));
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      var atChats = false;
      final router = GoRouter(
        initialLocation: '/chat',
        routes: [
          GoRoute(
            path: '/chats',
            builder: (context, state) {
              atChats = true;
              return const Scaffold(body: Text('Chats'));
            },
          ),
          GoRoute(
            path: '/chat',
            builder: (context, state) => Scaffold(
              body: MiddleBarBottomBar(
                chatUUID: testChatUUID,
                subID: testSubID,
                textController: controller,
                isRecording: false,
                recorderState: const VoiceRecorderState(),
                onSendMessage: () {},
                onTogglePause: () {},
                onStopAndDraft: () {},
                focusNode: focusNode,
              ),
            ),
          ),
        ],
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(
            routerConfig: router,
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: const Locale('en'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      focusNode.requestFocus();
      await tester.pump();

      // Press Escape
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();

      expect(atChats, isTrue);
    });
  });
}
