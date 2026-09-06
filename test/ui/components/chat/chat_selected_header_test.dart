import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_selected_header.dart';

void main() {
  Widget buildTestHeader({
    required int selectedCount,
    VoidCallback? onClose,
    VoidCallback? onReply,
    VoidCallback? onForward,
    VoidCallback? onDelete,
  }) {
    return MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      locale: const Locale('en'),
      home: Scaffold(
        appBar: ChatSelectedHeader(
          selectedCount: selectedCount,
          onClose: onClose ?? () {},
          onReply: onReply,
          onForward: onForward,
          onDelete: onDelete,
        ),
      ),
    );
  }

  group('ChatSelectedHeader Widget Tests', () {
    testWidgets('renders selected count and action icons', (tester) async {
      await tester.pumpWidget(
        buildTestHeader(
          selectedCount: 2,
          onReply: () {},
          onForward: () {},
          onDelete: () {},
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('2 selected'), findsOneWidget);
      // Reply should be visible for count 2
      expect(find.byTooltip('Reply'), findsOneWidget);
      expect(find.byTooltip('Forward'), findsOneWidget);
      expect(find.byTooltip('Delete'), findsOneWidget);
    });

    testWidgets('hides Reply icon when selectedCount > 3', (tester) async {
      await tester.pumpWidget(
        buildTestHeader(
          selectedCount: 4,
          onReply: () {},
          onForward: () {},
          onDelete: () {},
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('4 selected'), findsOneWidget);
      // Reply icon should NOT be visible when count > 3
      expect(find.byTooltip('Reply'), findsNothing);
      expect(find.byTooltip('Forward'), findsOneWidget);
      expect(find.byTooltip('Delete'), findsOneWidget);
    });

    testWidgets('tapping Close calls onClose callback', (tester) async {
      bool closed = false;

      await tester.pumpWidget(
        buildTestHeader(
          selectedCount: 1,
          onClose: () => closed = true,
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('Cancel'));
      await tester.pumpAndSettle();

      expect(closed, isTrue);
    });
  });
}
