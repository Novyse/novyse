import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu_item.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu_sheet.dart';
import 'package:novyse/ui/components/switch/segmented_switch.dart';

void main() {
  Future<void> pumpSheet(WidgetTester tester, {String locale = 'en'}) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: Locale(locale),
          home: const Scaffold(
            body: AttachMenuSheetContent(chatUUID: 'chat-test-1'),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  SegmentedSwitch<AttachMenuAction> findSwitch(WidgetTester tester) =>
      tester.widget<SegmentedSwitch<AttachMenuAction>>(
        find.byType(SegmentedSwitch<AttachMenuAction>),
      );

  group('AttachMenuSheetContent', () {
    testWidgets('shows 7 segments in development order (en)', (tester) async {
      await pumpSheet(tester);

      final sw = findSwitch(tester);
      expect(sw.options.map((o) => o.value).toList(), [
        AttachMenuAction.media,
        AttachMenuAction.camera,
        AttachMenuAction.file,
        AttachMenuAction.recording,
        AttachMenuAction.location,
        AttachMenuAction.todo,
        AttachMenuAction.poll,
      ]);

      for (final label in [
        'Media',
        'Camera',
        'File',
        'Recording',
        'Location',
        'Todo',
        'Poll',
      ]) {
        expect(find.text(label), findsWidgets);
      }
    });

    testWidgets('only Media and File segments are enabled', (tester) async {
      await pumpSheet(tester);

      final byAction = {
        for (final o in findSwitch(tester).options) o.value: o.enabled,
      };
      expect(byAction[AttachMenuAction.media], isTrue);
      expect(byAction[AttachMenuAction.file], isTrue);
      expect(byAction[AttachMenuAction.camera], isFalse);
      expect(byAction[AttachMenuAction.recording], isFalse);
      expect(byAction[AttachMenuAction.location], isFalse);
      expect(byAction[AttachMenuAction.todo], isFalse);
      expect(byAction[AttachMenuAction.poll], isFalse);
    });

    testWidgets('tapping a disabled segment does not switch panel', (
      tester,
    ) async {
      await pumpSheet(tester);

      expect(findSwitch(tester).value, AttachMenuAction.media);

      await tester.tap(find.text('Camera'));
      await tester.pumpAndSettle();

      expect(findSwitch(tester).value, AttachMenuAction.media);
      expect(find.byType(AttachMenuSheetContent), findsOneWidget);
    });

    testWidgets('tapping File switches panel', (tester) async {
      await pumpSheet(tester);

      await tester.tap(find.text('File'));
      await tester.pumpAndSettle();

      expect(findSwitch(tester).value, AttachMenuAction.file);
    });

    testWidgets('media and file panels expose a Select action button', (
      tester,
    ) async {
      await pumpSheet(tester);

      // Media panel (default): action button opens the picker, no auto-open.
      expect(find.text('Select'), findsOneWidget);
      await tester.tap(find.text('Select'));
      await tester.pumpAndSettle();
      // Picker unavailable in tests: panel stays open.
      expect(find.byType(AttachMenuSheetContent), findsOneWidget);

      await tester.tap(find.text('File'));
      await tester.pumpAndSettle();

      expect(find.text('Select'), findsOneWidget);
      await tester.tap(find.text('Select'));
      await tester.pumpAndSettle();
      expect(find.byType(AttachMenuSheetContent), findsOneWidget);
    });

    testWidgets('shows italian segment labels', (tester) async {
      await pumpSheet(tester, locale: 'it');

      for (final label in [
        'Media',
        'Fotocamera',
        'File',
        'Registra',
        'Posizione',
        'Lista',
        'Sondaggio',
      ]) {
        expect(find.text(label), findsWidgets);
      }
    });
  });
}
