import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/mention_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/default_bottom_bar.dart';

class _TestUserNotifier extends UserNotifier {
  final UserStoreState initialState;
  _TestUserNotifier(this.initialState);

  @override
  UserStoreState build() => initialState;
}

void main() {
  group('MentionBar Widget Tests', () {
    const user1 = UserModel(
      uuid: 'user-1',
      name: 'Mario',
      surname: 'Rossi',
      handle: 'mario',
    );
    const user2 = UserModel(
      uuid: 'user-2',
      name: 'Luigi',
      surname: 'Verdi',
      handle: 'luigi',
    );

    testWidgets('renders list of members with display names and handles', (
      tester,
    ) async {
      UserModel? selected;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MentionBar(
              chatUUID: 'test-chat',
              members: const [user1, user2],
              onSelectMember: (m) => selected = m,
            ),
          ),
        ),
      );

      expect(find.text('Mario Rossi'), findsOneWidget);
      expect(find.text('@mario'), findsOneWidget);
      expect(find.text('Luigi Verdi'), findsOneWidget);
      expect(find.text('@luigi'), findsOneWidget);

      await tester.tap(find.text('Mario Rossi'));
      await tester.pump();

      expect(selected, equals(user1));
    });

    testWidgets('returns SizedBox.shrink when members list is empty', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MentionBar(
              chatUUID: 'test-chat',
              members: const [],
              onSelectMember: (_) {},
            ),
          ),
        ),
      );

      expect(find.byType(ListView), findsNothing);
    });

    testWidgets(
      'typing @ in group chat triggers MentionBar and selection replaces query',
      (tester) async {
        final container = ProviderContainer(
          overrides: [
            chatProvider('group-1').overrideWithValue(
              ChatModel(
                uuid: 'group-1',
                type: 'GROUP',
                name: 'Test Group',
                members: [
                  {'uuid': 'me', 'name': 'Self', 'handle': 'self'},
                  {
                    'uuid': 'user-1',
                    'name': 'Mario',
                    'surname': 'Rossi',
                    'handle': 'mario',
                  },
                  {
                    'uuid': 'user-2',
                    'name': 'Luigi',
                    'surname': 'Verdi',
                    'handle': 'luigi',
                  },
                ],
              ),
            ),
            userStoreProvider.overrideWith(
              () => _TestUserNotifier(
                UserStoreState(
                  localUserUUID: 'me',
                  users: {'user-1': user1, 'user-2': user2},
                ),
              ),
            ),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              home: Scaffold(body: DefaultBottomBar(chatUUID: 'group-1')),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // MentionBar widget is always mounted in DefaultBottomBar, but shows nothing initially
        expect(find.byType(MentionBar), findsOneWidget);
        expect(
          find.descendant(
            of: find.byType(MentionBar),
            matching: find.byType(ListView),
          ),
          findsNothing,
        );

        // Type "@" in the input field
        await tester.enterText(find.byType(TextField), '@');
        await tester.pump();

        // MentionBar should now show suggestions for Mario and Luigi
        expect(
          find.descendant(
            of: find.byType(MentionBar),
            matching: find.byType(ListView),
          ),
          findsOneWidget,
        );
        expect(find.text('Mario Rossi'), findsOneWidget);
        expect(find.text('Luigi Verdi'), findsOneWidget);

        // Filter with "@lu"
        await tester.enterText(find.byType(TextField), '@lu');
        await tester.pump();

        expect(find.text('Luigi Verdi'), findsOneWidget);
        expect(find.text('Mario Rossi'), findsNothing);

        // Tap on Luigi
        await tester.tap(find.text('Luigi Verdi'));
        await tester.pump();

        // Text should be replaced with "@luigi "
        final controller = container.read(
          chatTextControllerProvider('group-1'),
        );
        expect(controller.text, equals('@luigi '));
        // MentionBar suggestions should now be closed
        expect(
          find.descendant(
            of: find.byType(MentionBar),
            matching: find.byType(ListView),
          ),
          findsNothing,
        );
      },
    );

    testWidgets('MentionBar does not open in DM chats', (tester) async {
      final container = ProviderContainer(
        overrides: [
          chatProvider('dm-1').overrideWithValue(
            ChatModel(
              uuid: 'dm-1',
              type: 'DM',
              name: 'Direct Chat',
              members: [
                {'uuid': 'me', 'name': 'Self', 'handle': 'self'},
                {'uuid': 'user-1', 'name': 'Mario', 'handle': 'mario'},
              ],
            ),
          ),
          userStoreProvider.overrideWith(
            () => _TestUserNotifier(
              UserStoreState(localUserUUID: 'me', users: {'user-1': user1}),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(body: DefaultBottomBar(chatUUID: 'dm-1')),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), '@');
      await tester.pump();

      expect(
        find.descendant(
          of: find.byType(MentionBar),
          matching: find.byType(ListView),
        ),
        findsNothing,
      );
    });
  });
}
