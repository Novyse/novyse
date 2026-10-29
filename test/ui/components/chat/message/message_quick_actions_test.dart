import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/message_quick_action.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/message/message_base.dart';
import 'package:novyse/ui/components/chat/message/message_quick_actions.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class _StubSettingsController extends SettingsController {
  _StubSettingsController(this.preset);

  final Map<String, Object?> preset;

  @override
  Map<String, Object?> build() => Map<String, Object?>.of(preset);
}

class _FakeUserNotifier extends UserNotifier {
  _FakeUserNotifier(this.myUUID);

  final String myUUID;

  @override
  UserStoreState build() => UserStoreState(localUserUUID: myUUID);
}

void main() {
  group('MessageQuickAction options', () {
    test('disables the action already used by the other slot', () {
      final options = MessageQuickAction.options(
        other: MessageQuickAction.reply,
      );

      bool disabled(String value) =>
          options.firstWhere((option) => option.value == value).disabled;

      expect(disabled(MessageQuickAction.none), isFalse);
      expect(disabled(MessageQuickAction.reply), isTrue);
      expect(disabled(MessageQuickAction.edit), isFalse);
      expect(disabled(MessageQuickAction.delete), isFalse);
    });

    test('none stays available on both slots', () {
      final options = MessageQuickAction.options(
        other: MessageQuickAction.none,
      );
      expect(options.every((option) => option.disabled == false), isTrue);
    });

    test('resolve drops none and a duplicate action', () {
      expect(
        MessageQuickAction.resolve(
          MessageQuickAction.reply,
          MessageQuickAction.none,
        ),
        [MessageQuickAction.reply],
      );
      expect(
        MessageQuickAction.resolve(
          MessageQuickAction.delete,
          MessageQuickAction.delete,
        ),
        [MessageQuickAction.delete],
      );
      expect(
        MessageQuickAction.resolve(
          MessageQuickAction.reply,
          MessageQuickAction.edit,
        ),
        [MessageQuickAction.reply, MessageQuickAction.edit],
      );
    });
  });

  group('Message quick action buttons', () {
    final message = MessageModel(
      id: 7,
      chatUUID: 'chat-1',
      userUUID: 'me',
      createdAt: DateTime.utc(2026, 1, 1),
      content: 'Hello from the bubble',
    );

    Widget harness(Map<String, Object?> settings) {
      return ProviderScope(
        overrides: [
          settingsControllerProvider.overrideWith(
            () => _StubSettingsController(settings),
          ),
          userStoreProvider.overrideWith(() => _FakeUserNotifier('me')),
        ],
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: const Locale('en'),
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.only(top: 48),
              child: Align(
                alignment: Alignment.topLeft,
                child: MessageBase(message: message, isSender: true),
              ),
            ),
          ),
        ),
      );
    }

    Finder icon(List<List<dynamic>> data) {
      return find.byWidgetPredicate(
        (widget) => widget is AppHugeIcon && widget.icon == data,
      );
    }

    Future<void> hoverMessage(WidgetTester tester) async {
      final gesture = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await gesture.addPointer(location: Offset.zero);
      addTearDown(gesture.removePointer);
      await tester.pump();
      await gesture.moveTo(
        tester.getCenter(find.text('Hello from the bubble')),
      );
      await tester.pump();
    }

    testWidgets('shows the two configured buttons only while hovering', (
      tester,
    ) async {
      await tester.pumpWidget(harness(const {}));
      await tester.pump();

      expect(icon(HugeIcons.strokeRoundedArrowMoveUpLeft), findsNothing);
      expect(icon(HugeIcons.strokeRoundedEdit02), findsNothing);

      final textRect = tester.getRect(find.text('Hello from the bubble'));
      final gesture = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await gesture.addPointer(location: Offset.zero);
      addTearDown(gesture.removePointer);
      await tester.pump();

      // Empty space on the message row, beside the bubble, stays quiet.
      await gesture.moveTo(Offset(8, textRect.center.dy));
      await tester.pump();
      expect(icon(HugeIcons.strokeRoundedArrowMoveUpLeft), findsNothing);

      await gesture.moveTo(textRect.center);
      await tester.pump();

      expect(icon(HugeIcons.strokeRoundedArrowMoveUpLeft), findsOneWidget);
      expect(icon(HugeIcons.strokeRoundedEdit02), findsOneWidget);
      expect(icon(HugeIcons.strokeRoundedDelete02), findsNothing);

      final bubbleRect = tester.getRect(
        find
            .ancestor(
              of: find.text('Hello from the bubble'),
              matching: find.byType(InkWell),
            )
            .first,
      );
      final buttonRect = tester.getRect(
        icon(HugeIcons.strokeRoundedArrowMoveUpLeft),
      );
      expect(buttonRect.top, lessThan(bubbleRect.top));
      expect(bubbleRect.top - buttonRect.top, lessThan(28));
      expect((buttonRect.bottom - bubbleRect.top).abs(), lessThan(8));
      expect(buttonRect.left, lessThan(bubbleRect.left));

      await tester.pump(const Duration(milliseconds: 150));
      final fade = find.descendant(
        of: find.byType(MessageQuickActionsOverlay),
        matching: find.byType(FadeTransition),
      );
      expect(tester.widget<FadeTransition>(fade).opacity.value, 1);

      await gesture.moveTo(Offset(8, textRect.center.dy));
      // The fade starts on the frame after the pointer leaves.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(tester.widget<FadeTransition>(fade).opacity.value, lessThan(1));

      await tester.pump(const Duration(milliseconds: 150));
      await tester.pump();
      expect(icon(HugeIcons.strokeRoundedArrowMoveUpLeft), findsNothing);
    });

    testWidgets('hides a slot set to none', (tester) async {
      await tester.pumpWidget(
        harness({
          MessageQuickAction.settingKey1: MessageQuickAction.reply,
          MessageQuickAction.settingKey2: MessageQuickAction.none,
        }),
      );
      await tester.pump();
      await hoverMessage(tester);

      expect(icon(HugeIcons.strokeRoundedArrowMoveUpLeft), findsOneWidget);
      expect(icon(HugeIcons.strokeRoundedEdit02), findsNothing);
    });

    testWidgets('reply button adds the message to the draft', (tester) async {
      final container = ProviderContainer(
        overrides: [
          settingsControllerProvider.overrideWith(
            () => _StubSettingsController({
              MessageQuickAction.settingKey1: MessageQuickAction.reply,
              MessageQuickAction.settingKey2: MessageQuickAction.none,
            }),
          ),
          userStoreProvider.overrideWith(() => _FakeUserNotifier('me')),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: const Locale('en'),
            home: Scaffold(
              body: Padding(
                padding: const EdgeInsets.only(top: 48),
                child: MessageBase(message: message, isSender: true),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      await hoverMessage(tester);
      await tester.tap(icon(HugeIcons.strokeRoundedArrowMoveUpLeft));
      await tester.pump();

      final draft = container.read(chatDraftProvider('chat-1'));
      expect(draft.replyingTo, hasLength(1));
      expect(draft.replyingTo.single.message.id, 7);
    });
  });
}
