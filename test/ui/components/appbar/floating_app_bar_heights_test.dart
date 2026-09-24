import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/pages/app/settings_page.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_detail_app_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_detail_search_app_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_selected_header.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_app_bar.dart';

Widget _wrap(Widget child) {
  return ProviderScope(
    child: MaterialApp(
      localizationsDelegates: localizationsDelegates,
      supportedLocales: supportedLocales,
      locale: const Locale('en'),
      home: Scaffold(body: child),
    ),
  );
}

List<double> _pillHeights(WidgetTester tester) => [
  for (final e in find.byType(FloatingPill).evaluate())
    (e.renderObject! as RenderBox).size.height,
];

void main() {
  testWidgets('every floating app bar pill measures 46 (44 + border)',
      (tester) async {
    final searchController = TextEditingController();
    final searchFocus = FocusNode();
    addTearDown(searchController.dispose);
    addTearDown(searchFocus.dispose);

    Future<void> expectAll46(Widget bar, String label) async {
      await tester.pumpWidget(_wrap(bar));
      await tester.pumpAndSettle();
      for (final h in _pillHeights(tester)) {
        expect(h, moreOrLessEquals(46.0, epsilon: 0.5), reason: label);
      }
    }

    await expectAll46(
      ChatListAppBar(
        searching: true,
        searchController: searchController,
        searchFocusNode: searchFocus,
        onQueryChanged: (_) {},
        onOpenSearch: () {},
        onCloseSearch: () {},
        onNewChat: () {},
      ),
      'chat-list searching',
    );

    await expectAll46(
      ChatDetailSearchAppBar(
        controller: searchController,
        focusNode: searchFocus,
        onQueryChanged: (_) {},
        onClose: () {},
        totalResults: 5,
        currentIndex: 1,
        onNext: () {},
        onPrevious: () {},
      ),
      'chat-detail searching',
    );

    await expectAll46(
      ChatDetailAppBar(
        title: 'T',
        subtitle: 'S',
        subtitleHighlighted: false,
        avatarUuid: null,
        seedKey: 'k',
        isOnline: false,
        isSavedMessages: false,
        chatType: 'DM',
        showVocal: false,
        showSearch: true,
        showViewToggle: true,
        onBack: () {},
        onOpenSearch: () {},
        onToggleView: () {},
      ),
      'chat-detail normal',
    );

    await expectAll46(
      ChatSelectedHeader(
        selectedCount: 2,
        onClose: () {},
        onReply: () {},
        onForward: () {},
        onDelete: () {},
      ),
      'selected header',
    );

    await expectAll46(const SettingsPage(), 'settings root');
  });
}
