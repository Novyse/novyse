import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/favorite_messages_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/pages/app/chat_overview_page.dart';
import 'package:novyse/ui/components/chat/chat_overview/chat_overview_app_bar.dart';
import 'package:novyse/ui/components/switch/segmented_switch.dart';

class _StubMsgNotifier extends MessageListNotifier {
  @override
  MessageListState build(({String chatUUID, int subID}) arg) =>
      const MessageListState();

  @override
  Future<void> init({int limit = 50}) async {}
}

class _StubFavNotifier extends FavoriteMessagesNotifier {
  @override
  FavoriteMessagesState build(String? arg) => const FavoriteMessagesState();

  @override
  Future<void> init() async {}
}

Future<void> _pumpOverview(WidgetTester tester) async {
  final chat = ChatModel(
    uuid: 'chat-1',
    name: 'Test Group',
    type: 'GROUP',
    members: [
      for (var i = 0; i < 30; i++) {'uuid': 'u$i', 'name': 'Member $i'},
    ],
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        chatProvider('chat-1').overrideWithValue(chat),
        chatMessagesProvider.overrideWith(_StubMsgNotifier.new),
        favoriteMessagesProvider.overrideWith(_StubFavNotifier.new),
      ],
      child: const MaterialApp(
        localizationsDelegates: [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
        supportedLocales: [Locale('en')],
        home: ChatOverviewPage(chatUUID: 'chat-1', subID: 0),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

/// Offstage flags of the nearest [Offstage] ancestor of each tabs switch,
/// in tree order (in-flow strip first, sticky overlay copy second).
List<bool> _tabsOffstageFlags(WidgetTester tester) {
  // Both switches must be found even when offstage.
  final switches = find.byType(
    SegmentedSwitch<OverviewTab>,
    skipOffstage: false,
  );
  expect(switches, findsNWidgets(2));
  return [
    for (final element in switches.evaluate()) _nearestOffstage(element),
  ];
}

bool _nearestOffstage(Element element) {
  bool? flag;
  element.visitAncestorElements((ancestor) {
    final widget = ancestor.widget;
    if (widget is Offstage) {
      flag = widget.offstage;
      return false;
    }
    return true;
  });
  return flag!;
}

void main() {
  testWidgets('tabs strip pins below the app bar instead of sliding under', (
    tester,
  ) async {
    await _pumpOverview(tester);

    // Initially the in-flow strip is visible, the sticky copy is offstage.
    expect(_tabsOffstageFlags(tester), [false, true]);
    expect(find.text('Media'), findsOneWidget);

    // Scroll the page until the strip reaches the app bar.
    await tester.dragFrom(const Offset(400, 500), const Offset(0, -450));
    await tester.pumpAndSettle();
    await tester.dragFrom(const Offset(400, 500), const Offset(0, -450));
    await tester.pumpAndSettle();

    // Now the in-flow strip is offstage and the sticky copy is shown.
    expect(_tabsOffstageFlags(tester), [true, false]);

    // The sticky copy sits right below the app bar (never cut by it).
    final barBottom = tester.getRect(find.byType(ChatOverviewAppBar)).bottom;
    final stickyTop = tester
        .getRect(find.byType(SegmentedSwitch<OverviewTab>))
        .top;
    expect(stickyTop, moreOrLessEquals(barBottom, epsilon: 1));

    // The pinned copy is interactive: finders skip the offstage in-flow
    // strip, so this taps the sticky one.
    await tester.tap(find.text('Media'));
    await tester.pumpAndSettle();
    expect(find.text('No media shared yet'), findsOneWidget);
  });
}
