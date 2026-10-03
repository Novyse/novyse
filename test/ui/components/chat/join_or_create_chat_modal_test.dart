import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/chat_service.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/ui/components/chat/join_or_create_chat_modal.dart';
import 'package:novyse/ui/components/status/status_message.dart';

import '../../../helpers/fake_gateway.dart';
import '../../../helpers/fake_http.dart';

/// `JoinOrCreateChatModal` either opens a DM with a user or joins a chat by
/// handle. Both paths go through `ChatService`, which takes a `Gateway`, so the
/// fake transport answers them offline.
void main() {
  late FakeGateway gateway;
  late List<String> joined;

  ChatModel chat({String uuid = 'u1', String type = 'DM', String? handle}) =>
      ChatModel(uuid: uuid, name: 'Ada Lovelace', type: type, handle: handle);

  /// Pumps the modal for [chat] and returns the l10n strings.
  Future<AppLocalizations> pump(
    WidgetTester tester, {
    required ChatModel target,
    Object? createData,
    Object? joinData,
    bool success = true,
  }) async {
    gateway = FakeGateway(
      FakeHttp.replying((options) {
        if (options.path == '/chat/join') {
          return envelope(success: success, data: success ? joinData : null);
        }
        return envelope(success: success, data: success ? createData : null);
      }),
    );
    joined = <String>[];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          chatServiceProvider.overrideWithValue(ChatService(gateway)),
        ],
        child: MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: SingleChildScrollView(
              child: JoinOrCreateChatModal(chat: target, onJoined: joined.add),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    return AppLocalizations.of(
      tester.element(find.byType(JoinOrCreateChatModal)),
    )!;
  }

  /// Scrolls the bottom of the modal into view so the action button, which is
  /// the same text as the title, can be tapped.
  Future<void> scrollToAction(WidgetTester tester, String label) async {
    await tester.ensureVisible(find.text(label).last);
    await tester.pumpAndSettle();
  }

  group('title and description', () {
    testWidgets('a user gets the start-a-DM title', (tester) async {
      final l10n = await pump(tester, target: chat());

      // The action button reuses the title as its label.
      expect(find.text(l10n.joinCreateStartDm), findsNWidgets(2));
      expect(find.text(l10n.joinCreateUserDesc), findsOneWidget);
    });

    testWidgets('a channel gets its own title', (tester) async {
      final l10n = await pump(
        tester,
        target: chat(type: 'CHANNEL', handle: 'general'),
      );

      expect(find.text(l10n.joinCreateJoinChannel), findsNWidgets(2));
      expect(find.text(l10n.joinCreateChatDesc), findsOneWidget);
    });

    testWidgets('a group gets its own title', (tester) async {
      final l10n = await pump(
        tester,
        target: chat(type: 'GROUP', handle: 'squad'),
      );

      expect(find.text(l10n.joinCreateJoinGroup), findsNWidgets(2));
    });

    testWidgets('a forum gets its own title', (tester) async {
      final l10n = await pump(
        tester,
        target: chat(type: 'FORUM', handle: 'board'),
      );

      expect(find.text(l10n.joinCreateJoinForum), findsNWidgets(2));
    });

    testWidgets('an unknown type falls back to the generic title', (
      tester,
    ) async {
      final l10n = await pump(
        tester,
        target: chat(type: 'WEIRD', handle: 'weird'),
      );

      expect(find.text(l10n.joinCreateJoinChat), findsNWidgets(2));
    });

    testWidgets('shows the name and the handle', (tester) async {
      await pump(
        tester,
        target: chat(type: 'GROUP', handle: 'squad'),
      );

      expect(find.text('Ada Lovelace'), findsOneWidget);
      expect(find.text('@squad'), findsOneWidget);
    });

    testWidgets('omits the handle when there is none', (tester) async {
      await pump(tester, target: chat());

      expect(find.text('@u1'), findsNothing);
      expect(find.text('Ada Lovelace'), findsOneWidget);
    });

    testWidgets('shows the security and notification notices', (tester) async {
      final l10n = await pump(tester, target: chat());

      expect(find.text(l10n.joinCreateSecurityDesc), findsOneWidget);
      expect(find.text(l10n.joinCreateNotificationDesc), findsOneWidget);
    });
  });

  group('starting a DM', () {
    testWidgets('creates the chat and reports the new uuid', (tester) async {
      final l10n = await pump(
        tester,
        target: chat(uuid: 'u-42'),
        createData: {
          'chat': {'uuid': 'chat-new', 'type': 'DM'},
          'users': <dynamic>[],
        },
      );

      await scrollToAction(tester, l10n.joinCreateStartDm);
      await tester.tap(find.text(l10n.joinCreateStartDm).last);
      await tester.pumpAndSettle();

      final create = gateway.http.requests.first;
      expect(create.path, '/chat/create');
      expect(create.json['type'], 'DM');
      expect(create.json['memberUUIDs'], ['u-42']);
      expect(joined, ['chat-new']);
    });

    testWidgets('reports a failure when the envelope is unsuccessful', (
      tester,
    ) async {
      final l10n = await pump(
        tester,
        target: chat(),
        createData: null,
        success: false,
      );

      await scrollToAction(tester, l10n.joinCreateStartDm);
      await tester.tap(find.text(l10n.joinCreateStartDm).last);
      await tester.pumpAndSettle();

      expect(find.text(l10n.joinCreateError), findsOneWidget);
      expect(joined, isEmpty);
    });

    testWidgets('reports an error when the user has no uuid', (tester) async {
      final l10n = await pump(tester, target: chat(uuid: ''));

      await scrollToAction(tester, l10n.joinCreateStartDm);
      await tester.tap(find.text(l10n.joinCreateStartDm).last);
      await tester.pumpAndSettle();

      expect(find.text(l10n.joinCreateError), findsOneWidget);
      expect(gateway.http.requests, isEmpty);
    });
  });

  group('joining a chat', () {
    testWidgets('joins by handle and reports the new uuid', (tester) async {
      final l10n = await pump(
        tester,
        target: chat(uuid: 'c-1', type: 'GROUP', handle: 'squad'),
        joinData: {
          'chat': {'uuid': 'chat-joined', 'type': 'GROUP'},
          'users': <dynamic>[],
        },
      );

      await scrollToAction(tester, l10n.joinCreateJoinGroup);
      await tester.tap(find.text(l10n.joinCreateJoinGroup).last);
      await tester.pumpAndSettle();

      expect(gateway.http.only.path, '/chat/join');
      expect(gateway.http.only.json, {'handle': 'squad'});
      expect(joined, ['chat-joined']);
    });

    testWidgets('reports an error when the chat has no handle', (tester) async {
      final l10n = await pump(
        tester,
        target: chat(uuid: 'c-1', type: 'GROUP'),
      );

      await scrollToAction(tester, l10n.joinCreateJoinGroup);
      await tester.tap(find.text(l10n.joinCreateJoinGroup).last);
      await tester.pumpAndSettle();

      expect(find.text(l10n.joinCreateError), findsOneWidget);
      expect(gateway.http.requests, isEmpty);
    });

    testWidgets('reports a failure when the envelope is unsuccessful', (
      tester,
    ) async {
      final l10n = await pump(
        tester,
        target: chat(uuid: 'c-1', type: 'GROUP', handle: 'squad'),
        success: false,
      );

      await scrollToAction(tester, l10n.joinCreateJoinGroup);
      await tester.tap(find.text(l10n.joinCreateJoinGroup).last);
      await tester.pumpAndSettle();

      expect(find.text(l10n.joinCreateError), findsOneWidget);
    });

    testWidgets('does not report a uuid when the response has none', (
      tester,
    ) async {
      final l10n = await pump(
        tester,
        target: chat(uuid: 'c-1', type: 'GROUP', handle: 'squad'),
        joinData: {
          'chat': <String, dynamic>{'type': 'GROUP'},
          'users': <dynamic>[],
        },
      );

      await scrollToAction(tester, l10n.joinCreateJoinGroup);
      await tester.tap(find.text(l10n.joinCreateJoinGroup).last);
      await tester.pumpAndSettle();

      expect(joined, isEmpty);
    });
  });

  group('transport failure', () {
    testWidgets('a join that throws surfaces the generic error', (
      tester,
    ) async {
      final l10n = await pump(
        tester,
        target: chat(uuid: 'c-1', type: 'GROUP', handle: 'squad'),
      );
      // Swap in an offline gateway.
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            chatServiceProvider.overrideWithValue(
              ChatService(FakeGateway.offline()),
            ),
          ],
          child: MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(
              body: SingleChildScrollView(
                child: JoinOrCreateChatModal(
                  chat: chat(uuid: 'c-1', type: 'GROUP', handle: 'squad'),
                  onJoined: (_) {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.ensureVisible(find.text(l10n.joinCreateJoinGroup).last);
      await tester.pumpAndSettle();
      await tester.tap(find.text(l10n.joinCreateJoinGroup).last);
      await tester.pumpAndSettle();

      expect(find.text(l10n.joinCreateError), findsOneWidget);
    });
  });

  group('error banner', () {
    testWidgets('no banner initially', (tester) async {
      await pump(tester, target: chat());

      expect(find.byType(StatusMessage), findsNothing);
    });
  });
}
