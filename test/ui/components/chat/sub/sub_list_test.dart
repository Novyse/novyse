import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/sub/sub_list.dart';

class _FakeCommsNotifier extends CommsNotifier {
  final List<({String chatUUID, int sub})> joinCalls = [];

  @override
  CommsState build() => const CommsState();

  @override
  Future<void> join(String chatUUID, {int sub = 0}) async {
    joinCalls.add((chatUUID: chatUUID, sub: sub));
  }
}

class _TestUserNotifier extends UserNotifier {
  @override
  UserStoreState build() {
    return const UserStoreState(localUserUUID: 'user-local', users: {});
  }
}

void main() {
  testWidgets('SubList selection updates selectedSub for text subs', (
    tester,
  ) async {
    final container = ProviderContainer(
      overrides: [
        userStoreProvider.overrideWith(_TestUserNotifier.new),
      ],
    );
    addTearDown(container.dispose);

    const chat = ChatModel(
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

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: const Locale('en'),
          home: Scaffold(
            body: SubList(
              chat: chat,
              selectedSub: 0,
              isCollapsed: false,
              width: 250,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Ideas'), findsOneWidget);
    await tester.tap(find.text('Ideas'));
    await tester.pumpAndSettle();

    expect(container.read(activeChatProvider).selectedSub, 1);
  });

  testWidgets('VOCAL sub tap joins comms when not already in room', (
    tester,
  ) async {
    final fakeComms = _FakeCommsNotifier();
    final container = ProviderContainer(
      overrides: [
        userStoreProvider.overrideWith(_TestUserNotifier.new),
        commsProvider.overrideWith(() => fakeComms),
      ],
    );
    addTearDown(container.dispose);

    const chat = ChatModel(
      uuid: 'forum-vocal',
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
        {'id': 2, 'name': 'Voice', 'type': 'VOCAL'},
      ],
    );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: const Locale('en'),
          home: Scaffold(
            body: SubList(
              chat: chat,
              selectedSub: 0,
              // Collapsed avoids VocalSubSubtitle / comms polling timers.
              isCollapsed: true,
              width: kSubListCollapsedWidth,
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    await tester.tap(find.text('V'));
    await tester.pump();

    expect(fakeComms.joinCalls, hasLength(1));
    expect(fakeComms.joinCalls.first.chatUUID, 'forum-vocal');
    expect(fakeComms.joinCalls.first.sub, 2);
    expect(container.read(activeChatProvider).selectedSub, 2);
  });
}
