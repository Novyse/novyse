import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu_item.dart';

void main() {
  var closeCalls = 0;

  Future<void> pumpPopover(WidgetTester tester, {String locale = 'en'}) async {
    closeCalls = 0;
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: Locale(locale),
          home: Scaffold(
            body: AttachMenuPopover(
              chatUUID: 'chat-test-1',
              onClose: () => closeCalls++,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  group('AttachMenuPopover', () {
    testWidgets('shows 7 icon-only entries in development order (en)', (
      tester,
    ) async {
      await pumpPopover(tester);

      final items = tester
          .widgetList<AttachMenuItem>(find.byType(AttachMenuItem))
          .toList();
      expect(
        items.map((i) => i.action).toList(),
        [
          AttachMenuAction.media,
          AttachMenuAction.camera,
          AttachMenuAction.file,
          AttachMenuAction.recording,
          AttachMenuAction.location,
          AttachMenuAction.todo,
          AttachMenuAction.poll,
        ],
      );
      expect(items.every((i) => i.iconOnly), isTrue);

      // Icon-only: no text labels, labels exposed via tooltips.
      expect(find.text('Media'), findsNothing);
      expect(find.text('File'), findsNothing);
      for (final label in [
        'Media',
        'Camera',
        'File',
        'Recording',
        'Location',
        'Todo',
        'Poll',
      ]) {
        expect(find.byTooltip(label), findsOneWidget);
      }
    });

    testWidgets('only Media and File are enabled', (tester) async {
      await pumpPopover(tester);

      final byAction = {
        for (final i in tester.widgetList<AttachMenuItem>(
          find.byType(AttachMenuItem),
        ))
          i.action: i.enabled,
      };
      expect(byAction[AttachMenuAction.media], isTrue);
      expect(byAction[AttachMenuAction.file], isTrue);
      expect(byAction[AttachMenuAction.camera], isFalse);
      expect(byAction[AttachMenuAction.recording], isFalse);
      expect(byAction[AttachMenuAction.location], isFalse);
      expect(byAction[AttachMenuAction.todo], isFalse);
      expect(byAction[AttachMenuAction.poll], isFalse);
    });

    testWidgets('tapping disabled entries does nothing', (tester) async {
      await pumpPopover(tester);

      for (final label in ['Recording', 'Camera', 'Location', 'Todo', 'Poll']) {
        await tester.tap(find.byTooltip(label));
        await tester.pumpAndSettle();
      }

      // Disabled taps neither close the popover nor crash.
      expect(closeCalls, 0);
      expect(find.byType(AttachMenuPopover), findsOneWidget);
    });

    testWidgets('shows italian tooltips', (tester) async {
      await pumpPopover(tester, locale: 'it');

      for (final label in [
        'Media',
        'Fotocamera',
        'File',
        'Registra',
        'Posizione',
        'Lista',
        'Sondaggio',
      ]) {
        expect(find.byTooltip(label), findsOneWidget);
      }
    });
  });
}
