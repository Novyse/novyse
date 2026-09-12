import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_content.dart';
import 'package:novyse/ui/components/chat/message/action_menu/message_action_menu.dart';
import 'package:novyse/ui/components/chat/message/action_menu/reaction_menu.dart';
import 'package:novyse/ui/components/chat/message/message_base.dart';
import 'package:novyse/ui/components/chat/message/message_system.dart';
import 'package:novyse/ui/components/chat/message/reactions/reaction_pill.dart';

class FakeUserNotifier extends UserNotifier {
  final String myUUID;
  FakeUserNotifier(this.myUUID);
  @override
  UserStoreState build() => UserStoreState(localUserUUID: myUUID);
}

void main() {
  group('ReactionMenu Widget Tests', () {
    testWidgets('renders quick mode with 3 emojis and expand button', (
      tester,
    ) async {
      String? picked;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            locale: const Locale('en'),
            home: Scaffold(
              body: ReactionMenu(
                onSelectEmoji: (emoji) {
                  picked = emoji;
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Quick emojis
      expect(find.text('❤️'), findsOneWidget);
      expect(find.text('👍'), findsOneWidget);
      expect(find.text('🔥'), findsOneWidget);

      // Tap emoji
      await tester.tap(find.text('🔥'));
      expect(picked, '🔥');
    });

    testWidgets('expanding ReactionMenu toggles full EmojiContent mode', (
      tester,
    ) async {
      bool? expandedState;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            locale: const Locale('en'),
            home: Scaffold(
              body: ReactionMenu(
                onSelectEmoji: (_) {},
                onExpandChanged: (exp) {
                  expandedState = exp;
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Click the expand arrow
      final expandBtnFinder = find.byWidgetPredicate(
        (w) => w is InkWell && w.child is Container,
      );
      await tester.tap(expandBtnFinder.last);
      await tester.pumpAndSettle();

      expect(expandedState, isTrue);
      // Full EmojiContent should now be rendered inside ReactionMenu
      expect(find.byType(EmojiContent), findsOneWidget);
    });
  });

  group('MessageActionMenu Reaction & System Message Tests', () {
    testWidgets(
      'renders only ReactionMenu and no action items for system message',
      (tester) async {
        final systemMsg = MessageModel(
          id: 999,
          chatUUID: 'chat-sys',
          userUUID: 'user-sys',
          createdAt: DateTime.now(),
          content: 'User joined chat',
          type: 'system',
        );

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              locale: const Locale('en'),
              home: Scaffold(
                body: MessageActionMenu(
                  position: const Offset(50, 50),
                  message: systemMsg,
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // ReactionMenu should be visible
        expect(find.byType(ReactionMenu), findsOneWidget);
        expect(find.text('❤️'), findsOneWidget);

        // Standard actions should NOT be visible
        expect(find.text('Reply'), findsNothing);
        expect(find.text('Pin'), findsNothing);
        expect(find.text('Copy'), findsNothing);
        expect(find.text('Delete'), findsNothing);
      },
    );

    testWidgets('renders stats footer when author message has reads or reactions', (
      tester,
    ) async {
      final myMsg = MessageModel(
        id: 777,
        chatUUID: 'chat-abc',
        userUUID: 'me',
        createdAt: DateTime.now(),
        content: 'Testing stats',
        reads: ['other1', 'other2'],
        reactions: [
          {
            'emoji': '🚀',
            'userUUIDs': ['other1', 'other2', 'me'],
          },
        ],
      );

      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => FakeUserNotifier('me')),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            locale: const Locale('en'),
            home: Scaffold(
              body: MessageActionMenu(
                position: const Offset(50, 50),
                message: myMsg,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Read count (2) and Reaction count (3) in footer
      expect(find.text('2'), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
    });
  });

  group('ReactionPill Widget Tests', () {
    testWidgets('displays emoji, avatar overlap, extra count, and toggles on tap', (
      tester,
    ) async {
      bool tapped = false;

      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => FakeUserNotifier('me')),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: Scaffold(
              body: ReactionPill(
                emoji: '🎉',
                userUUIDs: const ['user1', 'user2', 'me'],
                onTap: () {
                  tapped = true;
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('🎉'), findsOneWidget);
      // Total count: 3 users
      expect(find.text('3'), findsOneWidget);

      await tester.tap(find.byType(ReactionPill));
      expect(tapped, isTrue);
    });
  });

  group('System Message Reaction Support Tests', () {
    testWidgets('displays reactions underneath system pill and handles tap', (
      tester,
    ) async {
      Offset? menuPosition;

      final systemMsg = MessageModel(
        id: 100,
        chatUUID: 'chat-sys',
        userUUID: 'system',
        createdAt: DateTime.now(),
        type: 'system',
        content: 'System event',
        reactions: [
          {
            'emoji': '👏',
            'userUUIDs': ['u1', 'u2'],
          },
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            locale: const Locale('en'),
            home: Scaffold(
              body: MessageBase(
                message: systemMsg,
                onOpenContextMenu: (pos, _) {
                  menuPosition = pos;
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(MessageSystem), findsOneWidget);
      expect(find.text('👏'), findsOneWidget);
      // Verify emoji counter is visible for system message
      expect(find.text('2'), findsOneWidget);

      // Verify ReactionPill is present
      expect(find.byType(ReactionPill), findsOneWidget);

      // Tap or long press the system message pill
      await tester.longPress(find.byType(MessageSystem));
      expect(menuPosition, isNotNull);
    });
  });
}
