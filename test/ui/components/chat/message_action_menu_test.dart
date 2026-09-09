import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/permissions.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/message/action_menu/message_action_menu.dart';
import 'package:novyse/ui/components/chat/message/message_text.dart';

class FakeUserNotifier extends UserNotifier {
  final String myUUID;
  FakeUserNotifier(this.myUUID);
  @override
  UserStoreState build() => UserStoreState(localUserUUID: myUUID);
}

void main() {
  Widget buildTestWidget({
    required MessageModel message,
    String? selectedText,
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

    testWidgets('renders all author actions when local user is sender', (
      tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => FakeUserNotifier('user-xyz')),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        buildTestWidget(message: testMsg, container: container),
      );
      await tester.pumpAndSettle();

      expect(find.text('Reply'), findsOneWidget);
      expect(find.text('Pin'), findsOneWidget);
      expect(find.text('Copy'), findsOneWidget);
      expect(find.text('Edit'), findsOneWidget);
      expect(find.text('Forward'), findsOneWidget);
      expect(find.text('Select'), findsOneWidget);
      expect(find.text('Delete'), findsOneWidget);

      expect(find.text('Quote and reply'), findsNothing);
      expect(find.text('Copy selected'), findsNothing);
    });

    testWidgets(
      'does not render Delete or Edit for non-author without delete permissions',
      (tester) async {
        final container = ProviderContainer(
          overrides: [
            userStoreProvider.overrideWith(
              () => FakeUserNotifier('other-user'),
            ),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(
          buildTestWidget(message: testMsg, container: container),
        );
        await tester.pumpAndSettle();

        expect(find.text('Reply'), findsOneWidget);
        expect(find.text('Copy'), findsOneWidget);
        expect(find.text('Forward'), findsOneWidget);
        expect(find.text('Select'), findsOneWidget);

        expect(find.text('Delete'), findsNothing);
        expect(find.text('Edit'), findsNothing);
      },
    );

    testWidgets(
      'renders Quote and reply and Copy selected when text is selected',
      (tester) async {
        final container = ProviderContainer(
          overrides: [
            userStoreProvider.overrideWith(() => FakeUserNotifier('user-xyz')),
          ],
        );
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

        final replyingTo = container
            .read(chatDraftProvider('chat-abc'))
            .replyingTo;
        expect(replyingTo, isNotEmpty);
        expect(replyingTo.first.isQuote, isTrue);
      },
    );

    testWidgets('tapping Reply calls methods.reply and adds to draft', (
      tester,
    ) async {
      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => FakeUserNotifier('user-xyz')),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        buildTestWidget(message: testMsg, container: container),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Reply'));
      await tester.pumpAndSettle();

      final replyingTo = container
          .read(chatDraftProvider('chat-abc'))
          .replyingTo;
      expect(replyingTo, isNotEmpty);
      expect(replyingTo.first.message.id, equals(123));
    });

    testWidgets('renders Pin when message is not pinned', (tester) async {
      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => FakeUserNotifier('user-xyz')),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        buildTestWidget(
          message: testMsg.copyWith(pinned: false),
          container: container,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Pin'), findsOneWidget);
      expect(find.text('Unpin'), findsNothing);
    });

    testWidgets('renders Unpin when message is pinned', (tester) async {
      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => FakeUserNotifier('user-xyz')),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        buildTestWidget(
          message: testMsg.copyWith(pinned: true),
          container: container,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Unpin'), findsOneWidget);
      expect(find.text('Pin'), findsNothing);
    });

    testWidgets(
      'does not render Pin when member lacks pinMessage permission in group',
      (tester) async {
        final chatWithoutPin = ChatModel(
          uuid: 'chat-abc',
          name: 'Community',
          type: 'GROUP',
          roles: [
            {
              'id': 2,
              'permission':
                  (ChatPermissions.readMessage | ChatPermissions.sendMessage)
                      .toString(),
              'level': 1,
            },
          ],
          members: [
            {
              'uuid': 'user-xyz',
              'roleIDs': [2],
            },
          ],
        );

        final container = ProviderContainer(
          overrides: [
            userStoreProvider.overrideWith(() => FakeUserNotifier('user-xyz')),
            chatProvider('chat-abc').overrideWithValue(chatWithoutPin),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(
          buildTestWidget(message: testMsg, container: container),
        );
        await tester.pumpAndSettle();

        expect(find.text('Pin'), findsNothing);
        expect(find.text('Unpin'), findsNothing);
      },
    );

    testWidgets(
      'allows non-author admin with deleteMessage permission and level >= author level to delete message',
      (tester) async {
        final chatWithRoles = ChatModel(
          uuid: 'chat-abc',
          name: 'Community',
          type: 'GROUP',
          roles: [
            {
              'id': DefaultRoles.admin,
              'permission':
                  (ChatPermissions.readMessage |
                          ChatPermissions.sendMessage |
                          ChatPermissions.deleteMessage)
                      .toString(),
              'level': 50,
            },
            {
              'id': DefaultRoles.user,
              'permission':
                  (ChatPermissions.readMessage | ChatPermissions.sendMessage)
                      .toString(),
              'level': 1,
            },
          ],
          members: [
            {
              'uuid': 'admin-uuid',
              'roleIDs': [DefaultRoles.admin],
            },
            {
              'uuid': 'user-xyz',
              'roleIDs': [DefaultRoles.user],
            },
          ],
        );

        final container = ProviderContainer(
          overrides: [
            userStoreProvider.overrideWith(
              () => FakeUserNotifier('admin-uuid'),
            ),
            chatProvider('chat-abc').overrideWithValue(chatWithRoles),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(
          buildTestWidget(message: testMsg, container: container),
        );
        await tester.pumpAndSettle();

        expect(find.text('Delete'), findsOneWidget);
      },
    );

    testWidgets(
      'does not allow non-author admin to delete if role level is lower than author level',
      (tester) async {
        final chatWithRoles = ChatModel(
          uuid: 'chat-abc',
          name: 'Community',
          type: 'GROUP',
          roles: [
            {
              'id': DefaultRoles.owner,
              'permission':
                  (ChatPermissions.readMessage |
                          ChatPermissions.sendMessage |
                          ChatPermissions.deleteMessage)
                      .toString(),
              'level': 100,
            },
            {
              'id': DefaultRoles.admin,
              'permission':
                  (ChatPermissions.readMessage |
                          ChatPermissions.sendMessage |
                          ChatPermissions.deleteMessage)
                      .toString(),
              'level': 50,
            },
          ],
          members: [
            {
              'uuid': 'admin-uuid',
              'roleIDs': [DefaultRoles.admin],
            },
            {
              'uuid': 'owner-uuid',
              'roleIDs': [DefaultRoles.owner],
            },
          ],
        );

        final ownerMsg = MessageModel(
          id: 456,
          chatUUID: 'chat-abc',
          subID: 0,
          userUUID: 'owner-uuid',
          createdAt: DateTime.now(),
          content: 'Owner announcement',
          type: 'message',
        );

        final container = ProviderContainer(
          overrides: [
            userStoreProvider.overrideWith(
              () => FakeUserNotifier('admin-uuid'),
            ),
            chatProvider('chat-abc').overrideWithValue(chatWithRoles),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(
          buildTestWidget(message: ownerMsg, container: container),
        );
        await tester.pumpAndSettle();

        expect(find.text('Delete'), findsNothing);
      },
    );

    testWidgets(
      'does not allow non-author to delete another message in DM even with delete permission',
      (tester) async {
        final dmChat = ChatModel(
          uuid: 'chat-abc',
          name: 'Direct Message',
          type: 'DM',
          roles: [
            {
              'id': DefaultRoles.admin,
              'permission':
                  (ChatPermissions.readMessage |
                          ChatPermissions.sendMessage |
                          ChatPermissions.deleteMessage)
                      .toString(),
              'level': 50,
            },
          ],
          members: [
            {
              'uuid': 'me-uuid',
              'roleIDs': [DefaultRoles.admin],
            },
            {
              'uuid': 'other-uuid',
              'roleIDs': [DefaultRoles.admin],
            },
          ],
        );

        final otherUserMsg = MessageModel(
          id: 789,
          chatUUID: 'chat-abc',
          subID: 0,
          userUUID: 'other-uuid',
          createdAt: DateTime.now(),
          content: 'DM text',
          type: 'message',
        );

        final container = ProviderContainer(
          overrides: [
            userStoreProvider.overrideWith(() => FakeUserNotifier('me-uuid')),
            chatProvider('chat-abc').overrideWithValue(dmChat),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(
          buildTestWidget(message: otherUserMsg, container: container),
        );
        await tester.pumpAndSettle();

        expect(find.text('Delete'), findsNothing);
      },
    );

    testWidgets('hides Reply in ANNOUNCE channel for regular user', (
      tester,
    ) async {
      final announceChat = ChatModel(
        uuid: 'chat-abc',
        name: 'Announcements',
        type: 'CHANNEL',
        subs: [
          {'id': 1, 'type': 'ANNOUNCE'},
        ],
        roles: [
          {
            'id': DefaultRoles.user,
            'permission':
                (ChatPermissions.readMessage | ChatPermissions.sendMessage)
                    .toString(),
            'level': 1,
          },
        ],
        members: [
          {
            'uuid': 'user-uuid',
            'roleIDs': [DefaultRoles.user],
          },
        ],
      );

      final announceMsg = MessageModel(
        id: 111,
        chatUUID: 'chat-abc',
        subID: 1,
        userUUID: 'admin-uuid',
        createdAt: DateTime.now(),
        content: 'Official News',
        type: 'message',
      );

      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => FakeUserNotifier('user-uuid')),
          chatProvider('chat-abc').overrideWithValue(announceChat),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        buildTestWidget(message: announceMsg, container: container),
      );
      await tester.pumpAndSettle();

      expect(find.text('Reply'), findsNothing);
    });

    testWidgets('shows Reply in ANNOUNCE channel for admin', (tester) async {
      final announceChat = ChatModel(
        uuid: 'chat-abc',
        name: 'Announcements',
        type: 'CHANNEL',
        subs: [
          {'id': 1, 'type': 'ANNOUNCE'},
        ],
        roles: [
          {
            'id': DefaultRoles.admin,
            'permission':
                (ChatPermissions.readMessage | ChatPermissions.sendMessage)
                    .toString(),
            'level': 50,
          },
        ],
        members: [
          {
            'uuid': 'admin-uuid',
            'roleIDs': [DefaultRoles.admin],
          },
        ],
      );

      final announceMsg = MessageModel(
        id: 111,
        chatUUID: 'chat-abc',
        subID: 1,
        userUUID: 'admin-uuid',
        createdAt: DateTime.now(),
        content: 'Official News',
        type: 'message',
      );

      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(() => FakeUserNotifier('admin-uuid')),
          chatProvider('chat-abc').overrideWithValue(announceChat),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        buildTestWidget(message: announceMsg, container: container),
      );
      await tester.pumpAndSettle();

      expect(find.text('Reply'), findsOneWidget);
    });

    testWidgets(
      'right-clicking on selected text in MessageText triggers onOpenContextMenu and preserves selection',
      (tester) async {
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

        final gesture = await tester.startGesture(
          const Offset(50, 10),
          kind: PointerDeviceKind.mouse,
        );
        await gesture.moveTo(const Offset(100, 10));
        await gesture.up();
        await tester.pumpAndSettle();

        expect(currentSelection, isNotNull);
        final prevSelection = currentSelection;

        final rightClick = await tester.startGesture(
          const Offset(70, 10),
          kind: PointerDeviceKind.mouse,
          buttons: kSecondaryMouseButton,
        );
        await rightClick.up();
        await tester.pumpAndSettle();

        expect(menuAnchor, isNotNull);
        expect(currentSelection, equals(prevSelection));
      },
    );

    testWidgets(
      'right-clicking on unselected text in MessageText triggers onOpenContextMenu with null selection',
      (tester) async {
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

        final rightClick = await tester.startGesture(
          const Offset(70, 10),
          kind: PointerDeviceKind.mouse,
          buttons: kSecondaryMouseButton,
        );
        await rightClick.up();
        await tester.pumpAndSettle();

        expect(menuAnchor, isNotNull);
        expect(currentSelection, isNull);
      },
    );
  });
}
