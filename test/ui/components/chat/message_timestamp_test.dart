import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/message/message_timestamp.dart';

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

    expect(find.byIcon(Icons.access_time_rounded), findsOneWidget);
    expect(find.text('14:30'), findsNothing);
    expect(find.byIcon(Icons.check_rounded), findsNothing);
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

    expect(find.byIcon(Icons.access_time_rounded), findsNothing);
    expect(find.text('14:30'), findsOneWidget);
    expect(find.byIcon(Icons.done_all_rounded), findsOneWidget);
  });
}
