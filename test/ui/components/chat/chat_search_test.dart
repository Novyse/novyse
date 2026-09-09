import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_search.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_search_results.dart';

void main() {
  group('Local Chat Search Tests', () {
    testWidgets(
      'filterChatsByQuery filters chats correctly by name or handle',
      (tester) async {
        late AppLocalizations l10n;
        await tester.pumpWidget(
          MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Builder(
              builder: (context) {
                l10n = AppLocalizations.of(context)!;
                return const SizedBox();
              },
            ),
          ),
        );

        const chat1 = ChatModel(
          uuid: 'local-1',
          name: 'Flutter Devs',
          handle: 'flutter_devs',
          type: 'GROUP',
        );
        const chat2 = ChatModel(
          uuid: 'local-2',
          name: 'Design Team',
          handle: 'design_team',
          type: 'GROUP',
        );

        final matches = filterChatsByQuery(
          chats: const [chat1, chat2],
          query: 'flutter',
          localUserUUID: 'user-me',
          users: const {},
          l10n: l10n,
        );

        expect(matches.length, 1);
        expect(matches.first.uuid, 'local-1');
      },
    );

    test(
      'filterRemoteChats excludes remote chats that match local uuid or handle',
      () {
        const local = [
          ChatModel(
            uuid: 'uuid-1',
            name: 'Local User',
            handle: 'same_handle',
            type: 'DM',
          ),
        ];
        const remote = [
          ChatModel(uuid: 'uuid-1', name: 'Remote User 1', type: 'DM'),
          ChatModel(
            uuid: 'uuid-2',
            name: 'Remote User 2',
            handle: 'Same_Handle', // Case-insensitive match
            type: 'DM',
          ),
          ChatModel(
            uuid: 'uuid-3',
            name: 'Remote User 3',
            handle: 'unique_handle',
            type: 'DM',
          ),
        ];

        final filtered = filterRemoteChats(local: local, remote: remote);
        expect(filtered.length, 1);
        expect(filtered.first.uuid, 'uuid-3');
      },
    );
  });

  group('ChatSearchResults Widget Tests', () {
    testWidgets(
      'renders ChatSearchResults with local and global chat sections',
      (tester) async {
        const localChat = ChatModel(
          uuid: 'local-1',
          name: 'Local Devs',
          handle: 'local_devs',
          type: 'GROUP',
        );

        const remoteChat = ChatModel(
          uuid: 'remote-2',
          name: 'Global Flutter Channel',
          handle: 'global_flutter',
          type: 'CHANNEL',
        );

        ChatModel? openedChat;

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              home: Scaffold(
                body: CustomScrollView(
                  slivers: [
                    ChatSearchResults(
                      localChats: const [localChat],
                      remoteChats: const [remoteChat],
                      matchedMessages: const [],
                      messagesLoading: false,
                      query: 'flutter',
                      selectedChatUUID: null,
                      onOpenChat: (c) => openedChat = c,
                      onOpenMessage: (_) {},
                    ),
                  ],
                ),
              ),
            ),
          ),
        );

        // Verify Local section
        expect(find.text('CHATS'), findsOneWidget);
        expect(find.text('Local Devs'), findsOneWidget);

        // Verify Global section
        expect(find.text('GLOBAL CHATS'), findsOneWidget);
        expect(find.text('Global Flutter Channel'), findsOneWidget);

        await tester.tap(find.text('Global Flutter Channel'));
        expect(openedChat?.uuid, 'remote-2');
      },
    );
  });
}
