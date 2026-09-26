import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/pages/app/settings/settings_page.dart';
import 'package:novyse/ui/components/huge_icon.dart';

Widget _wrap(Widget child) {
  return ProviderScope(
    child: MaterialApp(
      localizationsDelegates: localizationsDelegates,
      supportedLocales: supportedLocales,
      locale: const Locale('en'),
      home: child,
    ),
  );
}

Finder _iconFinder(List<List<dynamic>> icon) => find.byWidgetPredicate(
      (w) => w is AppHugeIcon && w.icon == icon,
    );

Future<void> _openSearch(WidgetTester tester) async {
  await tester.pumpWidget(_wrap(const SettingsPage()));
  await tester.pumpAndSettle();
  await tester.tap(_iconFinder(HugeIcons.strokeRoundedSearch01));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('search icon opens a chat-style search field', (tester) async {
    await _openSearch(tester);

    expect(find.text('Search settings...'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    // Empty query keeps showing the categories.
    expect(find.text('Account'), findsOneWidget);
  });

  testWidgets('typing groups functional rows under a category header',
      (tester) async {
    await _openSearch(tester);

    await tester.enterText(find.byType(TextField), 'password');
    await tester.pumpAndSettle();

    // Category header row (navigates to the category page)...
    expect(find.text('Security & Privacy'), findsOneWidget);
    // ...and the functional matched row (disabled items stay dimmed
    // but visible instead of being hidden).
    expect(find.text('Password'), findsOneWidget);
    // Unrelated categories disappear.
    expect(find.text('Account'), findsNothing);
  });

  testWidgets('tapping the category header opens the category page',
      (tester) async {
    await _openSearch(tester);

    await tester.enterText(find.byType(TextField), 'password');
    await tester.pumpAndSettle();

    await tester.tap(find.text('Security & Privacy'));
    await tester.pumpAndSettle();

    // Category page shows its leaf pages.
    expect(find.text('Password & Security'), findsOneWidget);
    expect(find.text('Privacy'), findsOneWidget);
  });

  testWidgets('unknown query shows the empty state', (tester) async {
    await _openSearch(tester);

    await tester.enterText(find.byType(TextField), 'zzz-no-such-setting');
    await tester.pumpAndSettle();

    expect(find.text('No settings found'), findsOneWidget);
  });

  testWidgets('cancel restores the category list', (tester) async {
    await _openSearch(tester);

    await tester.enterText(find.byType(TextField), 'password');
    await tester.pumpAndSettle();
    expect(find.text('Account'), findsNothing);

    await tester.tap(find.byTooltip('Cancel'));
    await tester.pumpAndSettle();

    expect(find.text('Account'), findsOneWidget);
    expect(find.text('Security & Privacy'), findsOneWidget);
  });
}
