import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/pages/app/chat_call_page.dart';
import 'package:novyse/ui/components/chat/sub/sub_list.dart';
import 'package:novyse/ui/components/comms/comms_members_layout.dart';

Widget _wrap(Widget child, ProviderContainer container) {
  return UncontrolledProviderScope(
    container: container,
    child: MaterialApp(
      localizationsDelegates: localizationsDelegates,
      supportedLocales: supportedLocales,
      locale: const Locale('en'),
      home: Scaffold(body: child),
    ),
  );
}

const _chat = ChatModel(
  uuid: 'forum-1',
  name: 'Forum',
  type: 'FORUM',
  members: [
    {
      'uuid': 'user-local',
      'roleIDs': [0],
    },
  ],
  roles: [
    {'id': 0, 'name': 'Owner', 'permission': '1048575', 'level': 100},
  ],
  subs: [
    {'id': 0, 'name': 'General', 'type': 'MIXED'},
    {'id': 1, 'name': 'Ideas', 'type': 'TEXT'},
  ],
);

/// Outermost Padding rendered *by* [ancestorType] (depth-first, first match).
EdgeInsets _outerPaddingOf(WidgetTester tester, Type ancestorType) {
  final padding = tester.widget<Padding>(
    find
        .descendant(
          of: find.byType(ancestorType),
          matching: find.byType(Padding),
        )
        .first,
  );
  return padding.padding as EdgeInsets;
}

/// Padding wrapping [childType] (the bar containers built above the content).
EdgeInsets _wrappingPaddingOf(WidgetTester tester, Type childType) {
  final padding = tester.widget<Padding>(
    find.byWidgetPredicate(
      (w) => w is Padding && w.child.runtimeType == childType,
    ),
  );
  return padding.padding as EdgeInsets;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Measured header height drives content padding', () {
    testWidgets('SubList uses topPadding fallback when header is unmeasured',
        (tester) async {
      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(
            () => _StaticUserNotifier(
              const UserStoreState(localUserUUID: 'user-local', users: {}),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        _wrap(
          const SubList(
            chat: _chat,
            selectedSub: 0,
            isCollapsed: false,
            width: 250,
            topPadding: 78,
          ),
          container,
        ),
      );
      await tester.pumpAndSettle();

      expect(_outerPaddingOf(tester, SubList).top, 78);
      expect(tester.takeException(), isNull);
    });

    testWidgets('SubList follows measured header height', (tester) async {
      final container = ProviderContainer(
        overrides: [
          userStoreProvider.overrideWith(
            () => _StaticUserNotifier(
              const UserStoreState(localUserUUID: 'user-local', users: {}),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);
      container.read(activeChatProvider.notifier).setHeaderHeight(200);

      await tester.pumpWidget(
        _wrap(
          const SubList(
            chat: _chat,
            selectedSub: 0,
            isCollapsed: false,
            width: 250,
            topPadding: 78,
          ),
          container,
        ),
      );
      await tester.pumpAndSettle();

      expect(_outerPaddingOf(tester, SubList).top, 212);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ChatCallPage follows measured header height', (tester) async {
      final container = ProviderContainer();
      container.read(activeChatProvider.notifier).setHeaderHeight(200);

      await tester.pumpWidget(
        _wrap(const ChatCallPage(chatUUID: 'c', subID: 0), container),
      );
      // No pumpAndSettle: the room data provider polls periodically.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(_wrappingPaddingOf(tester, CommsMembersLayout).top, 212);
      // Stop the polling timer before the tree is torn down.
      container.dispose();
      expect(tester.takeException(), isNull);
    });

    testWidgets('ChatCallPage falls back without measured header',
        (tester) async {
      final container = ProviderContainer();

      await tester.pumpWidget(
        _wrap(const ChatCallPage(chatUUID: 'c', subID: 0), container),
      );
      // No pumpAndSettle: the room data provider polls periodically.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Test env has no status-bar padding: 0 + kToolbarHeight + 8.
      expect(_wrappingPaddingOf(tester, CommsMembersLayout).top, 64);
      // Stop the polling timer before the tree is torn down.
      container.dispose();
      expect(tester.takeException(), isNull);
    });
  });
}

class _StaticUserNotifier extends UserNotifier {
  _StaticUserNotifier(this._state);

  final UserStoreState _state;

  @override
  UserStoreState build() => _state;
}
