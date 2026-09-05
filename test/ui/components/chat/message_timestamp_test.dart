import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/message/message_timestamp.dart';
import 'package:novyse/ui/components/huge_icon.dart';

void main() {
  testWidgets('MessageTimestamp renders clock icon when isPending is true', (
    tester,
  ) async {
    final createdAt = DateTime(2026, 8, 31, 14, 30);

    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: localizationsDelegates,
        supportedLocales: supportedLocales,
        locale: const Locale('it'),
        home: Scaffold(
          body: MessageTimestamp(
            createdAt: createdAt,
            isSender: true,
            isPending: true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate(
        (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedClock01,
      ),
      findsOneWidget,
    );
    expect(find.text('14:30'), findsNothing);
    expect(
      find.byWidgetPredicate(
        (w) =>
            w is AppHugeIcon &&
            (w.icon == HugeIcons.strokeRoundedTick01 ||
                w.icon == HugeIcons.strokeRoundedTick02),
      ),
      findsNothing,
    );
  });

  testWidgets('MessageTimestamp renders time and checkmark when sent', (
    tester,
  ) async {
    final createdAt = DateTime(2026, 8, 31, 14, 30);

    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: localizationsDelegates,
        supportedLocales: supportedLocales,
        locale: const Locale('it'),
        home: Scaffold(
          body: MessageTimestamp(
            createdAt: createdAt,
            isSender: true,
            isPending: false,
            hasBeenRead: true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate(
        (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedClock01,
      ),
      findsNothing,
    );
    expect(find.text('14:30'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (w) => w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedTick02,
      ),
      findsOneWidget,
    );
  });
}
