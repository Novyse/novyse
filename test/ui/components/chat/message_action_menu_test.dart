import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/ui/components/chat/message/action_menu/message_action_menu.dart';
import 'package:novyse/ui/components/chat/message/message_text.dart';

void main() {
  Widget buildTestWidget({
    required MessageModel message,
    String? selectedText,
    bool isMine = false,
    ProviderContainer? container,
  }) {
    final widget = MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      locale: const Locale('en'),
      home: Scaffold(
        body: MessageActionMenu(
          position: const Offset(100, 100),
          message: message,
          selectedText: selectedText,
          isMine: isMine,
        ),
      ),
    );

    if (container != null) {
      return UncontrolledProviderScope(container: container, child: widget);
    }
    return ProviderScope(child: widget);
  }

  group('MessageActionMenu Widget Tests', () {
    final testMsg = MessageModel(
      id: 123,
      chatUUID: 'chat-abc',
      subID: 0,
      userUUID: 'user-xyz',
      createdAt: DateTime.now(),
      content: 'Hello World Novyse',
      type: 'message',
    );

    testWidgets('renders general menu items when no text selected', (tester) async {
      await tester.pumpWidget(buildTestWidget(message: testMsg));
      await tester.pumpAndSettle();

      expect(find.text('Reply'), findsOneWidget);
      expect(find.text('Copy'), findsOneWidget);
      expect(find.text('Select'), findsOneWidget);
      expect(find.text('Delete'), findsOneWidget);

      // Quote and reply & Copy selected should NOT appear when selectedText is null
      expect(find.text('Quote and reply'), findsNothing);
      expect(find.text('Copy selected'), findsNothing);
    });

    testWidgets('renders Quote and reply and Copy selected when text is selected', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        buildTestWidget(
          message: testMsg,
          selectedText: 'World',
          container: container,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Quote and reply'), findsOneWidget);
      expect(find.text('Copy selected'), findsOneWidget);

      await tester.tap(find.text('Quote and reply'));
      await tester.pumpAndSettle();

      final replyingTo = container.read(chatDraftProvider('chat-abc')).replyingTo;
      expect(replyingTo, isNotEmpty);
      expect(replyingTo.first.isQuote, isTrue);
    });

    testWidgets('tapping Reply calls methods.reply and adds to draft', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        buildTestWidget(
          message: testMsg,
          container: container,
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Reply'));
      await tester.pumpAndSettle();

      final replyingTo = container.read(chatDraftProvider('chat-abc')).replyingTo;
      expect(replyingTo, isNotEmpty);
      expect(replyingTo.first.message.id, equals(123));
    });

    testWidgets('renders Edit when isMine is true', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          message: testMsg,
          isMine: true,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Edit'), findsOneWidget);
    });

    testWidgets('right-clicking on selected text in MessageText triggers onOpenContextMenu and preserves selection', (tester) async {
      String? currentSelection;
      Offset? menuAnchor;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MessageText(
              content: 'Hello World Novyse Chat',
              onSelectionChanged: (txt) {
                currentSelection = txt;
              },
              onOpenContextMenu: (pos) {
                menuAnchor = pos;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Select "World" by dragging mouse
      final gesture = await tester.startGesture(const Offset(50, 10), kind: PointerDeviceKind.mouse);
      await gesture.moveTo(const Offset(100, 10));
      await gesture.up();
      await tester.pumpAndSettle();

      expect(currentSelection, isNotNull);
      final prevSelection = currentSelection;

      // Right-click on the selection
      final rightClick = await tester.startGesture(
        const Offset(70, 10),
        kind: PointerDeviceKind.mouse,
        buttons: kSecondaryMouseButton,
      );
      await rightClick.up();
      await tester.pumpAndSettle();

      expect(menuAnchor, isNotNull);
      expect(currentSelection, equals(prevSelection));
    });

    testWidgets('right-clicking on unselected text in MessageText triggers onOpenContextMenu with null selection', (tester) async {
      String? currentSelection = 'previously selected text';
      Offset? menuAnchor;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MessageText(
              content: 'Hello World Novyse Chat',
              onSelectionChanged: (txt) {
                currentSelection = txt;
              },
              onOpenContextMenu: (pos) {
                menuAnchor = pos;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Right click directly on unselected text
      final rightClick = await tester.startGesture(
        const Offset(70, 10),
        kind: PointerDeviceKind.mouse,
        buttons: kSecondaryMouseButton,
      );
      await rightClick.up();
      await tester.pumpAndSettle();

      expect(menuAnchor, isNotNull);
      expect(currentSelection, isNull);
    });
  });
}
