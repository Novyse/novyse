import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';

void main() {
  testWidgets(
    'ChatListItem renders Saved Messages for DM with only local user',
    (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final userNotifier = container.read(userStoreProvider.notifier);
      userNotifier.state = const UserStoreState(
        localUserUUID: 'user-local',
        users: {
          'user-local': UserModel(
            uuid: 'user-local',
            name: 'Mario',
            surname: 'Rossi',
            status: 'ONLINE',
          ),
        },
      );

      const chat = ChatModel(
        uuid: 'chat-saved',
        name: '',
        type: 'DM',
        members: [
          {'uuid': 'user-local', 'role': 'OWNER'},
        ],
        lastMessage: {
          'content': 'Note personali',
          'time': '2026-08-31T12:00:00.000Z',
        },
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('it'),
            home: Scaffold(body: ChatListItem(chat: chat)),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Messaggi salvati'), findsOneWidget);
      expect(find.textContaining('Note personali'), findsOneWidget);
    },
  );

  testWidgets('ChatListItem resolves other user name in DM', (tester) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final userNotifier = container.read(userStoreProvider.notifier);
    userNotifier.state = const UserStoreState(
      localUserUUID: 'user-local',
      users: {
        'user-local': UserModel(uuid: 'user-local', name: 'Mario'),
        'user-alice': UserModel(
          uuid: 'user-alice',
          name: 'Alice',
          handle: 'alice_w',
          status: 'ONLINE',
        ),
      },
    );

    const chat = ChatModel(
      uuid: 'chat-dm-alice',
      name: '',
      type: 'DM',
      members: [
        {'uuid': 'user-local'},
        {'uuid': 'user-alice'},
      ],
      lastMessage: {
        'content': 'Ci vediamo dopo!',
        'senderUUID': 'user-alice',
        'time': '2026-08-31T12:00:00.000Z',
      },
    );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: Locale('en'),
          home: Scaffold(body: ChatListItem(chat: chat)),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Alice'), findsOneWidget);
    expect(find.textContaining('Ci vediamo dopo!'), findsOneWidget);
  });

  testWidgets(
    'ChatListItem formats attachment via messageFormat and displays group name',
    (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final userNotifier = container.read(userStoreProvider.notifier);
      userNotifier.state = const UserStoreState(
        localUserUUID: 'user-local',
        users: {'user-bob': UserModel(uuid: 'user-bob', name: 'Bob')},
      );

      const chat = ChatModel(
        uuid: 'chat-group',
        name: 'Flutter Developers',
        type: 'GROUP',
        members: [
          {'uuid': 'user-local'},
          {'uuid': 'user-bob'},
        ],
        lastMessage: {
          'type': 'message',
          'content': '',
          'senderUUID': 'user-bob',
          'files': [
            {'name': 'screenshot.png', 'mimeType': 'image/png'},
          ],
          'time': '2026-08-31T12:00:00.000Z',
        },
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: Locale('it'),
            home: Scaffold(body: ChatListItem(chat: chat)),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Flutter Developers'), findsOneWidget);
      expect(find.textContaining('Bob:'), findsOneWidget);
      expect(find.textContaining('📷 Photo'), findsOneWidget);
    },
  );

  testWidgets('ChatListItem displays draft with red prefix when present', (
    tester,
  ) async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final userNotifier = container.read(userStoreProvider.notifier);
    userNotifier.state = const UserStoreState(
      localUserUUID: 'user-local',
      users: {},
    );

    final draftNotifier = container.read(
      chatDraftProvider('chat-with-draft').notifier,
    );
    draftNotifier.setText('Bozza di messaggio non inviato');

    const chat = ChatModel(
      uuid: 'chat-with-draft',
      name: 'General Discussion',
      type: 'GROUP',
    );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: Locale('it'),
          home: Scaffold(body: ChatListItem(chat: chat)),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Bozza:'), findsOneWidget);
    expect(
      find.textContaining('Bozza di messaggio non inviato'),
      findsOneWidget,
    );
  });
}
