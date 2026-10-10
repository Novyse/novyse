import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/chat_service.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/sub/create_sub_modal.dart';
import 'package:novyse/ui/components/onboarding/onboarding_text_field.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/status/status_message.dart';

import '../../../../helpers/fake_gateway.dart';
import '../../../../helpers/fake_http.dart';

/// `CreateSubModal` validates the sub name locally, then posts it to
/// `/chat/sub/create`. `ChatService` takes a `Gateway`, so the fake transport
/// answers offline.
void main() {
  late FakeGateway gateway;

  /// Pumps the modal and returns the l10n strings.
  Future<AppLocalizations> pump(
    WidgetTester tester, {
    Object? subData = true,
    bool success = true,
  }) async {
    gateway = FakeGateway(
      FakeHttp.replying(
        (_) => envelope(success: success, data: success ? subData : null),
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          chatServiceProvider.overrideWithValue(ChatService(gateway)),
        ],
        child: const MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: SingleChildScrollView(
              child: CreateSubModal(chatUUID: 'chat-1'),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    return AppLocalizations.of(tester.element(find.byType(CreateSubModal)))!;
  }

  /// Types into the name field.
  Future<void> typeName(WidgetTester tester, String value) async {
    await tester.enterText(find.byType(OnboardingTextField), value);
    await tester.pump();
  }

  /// Scrolls the create button into view and taps it.
  Future<void> tapCreate(WidgetTester tester, String label) async {
    await tester.ensureVisible(find.text(label).last);
    await tester.pumpAndSettle();
    await tester.tap(find.text(label).last);
    await tester.pumpAndSettle();
  }

  group('initial state', () {
    testWidgets('shows the name field', (tester) async {
      final l10n = await pump(tester);

      expect(find.text(l10n.createChatName), findsOneWidget);
    });

    testWidgets('carries no header of its own', (tester) async {
      await pump(tester);

      // The title bar belongs to ResponsiveOverlay.show(); the content widget
      // is body-only so dialogs and bottom sheets stay visually identical.
      expect(find.byType(OverlayHeader), findsNothing);
    });

    testWidgets('defaults to the MIXED sub type', (tester) async {
      final l10n = await pump(tester);

      expect(find.text(l10n.createSubMixed), findsOneWidget);
      expect(find.text(l10n.createSubType), findsOneWidget);
    });

    testWidgets('offers the four creatable types', (tester) async {
      final l10n = await pump(tester);

      expect(find.text(l10n.createSubMixed), findsOneWidget);
      expect(find.text(l10n.createSubText), findsOneWidget);
      expect(find.text(l10n.createSubVocal), findsOneWidget);
      expect(find.text(l10n.createSubAnnounce), findsOneWidget);
    });

    testWidgets('lists the two disabled types as unselectable chips', (
      tester,
    ) async {
      final l10n = await pump(tester);

      final broadcast = tester.widget<ChoiceChip>(
        find.widgetWithText(ChoiceChip, l10n.createSubBroadcast),
      );
      expect(broadcast.onSelected, isNull);
      expect(broadcast.selected, isFalse);

      final board = tester.widget<ChoiceChip>(
        find.widgetWithText(ChoiceChip, l10n.createSubBoard),
      );
      expect(board.onSelected, isNull);
    });

    testWidgets('no error banner initially', (tester) async {
      await pump(tester);

      expect(find.byType(StatusMessage), findsNothing);
    });
  });

  group('type selection', () {
    testWidgets('selecting a type highlights it', (tester) async {
      final l10n = await pump(tester);

      await tester.tap(find.text(l10n.createSubText));
      await tester.pump();

      final chip = tester.widget<ChoiceChip>(
        find.widgetWithText(ChoiceChip, l10n.createSubText),
      );
      expect(chip.selected, isTrue);
    });

    testWidgets('a disabled type cannot be selected', (tester) async {
      final l10n = await pump(tester);

      await tester.tap(find.text(l10n.createSubBroadcast));
      await tester.pump();

      // MIXED stays selected.
      final mixed = tester.widget<ChoiceChip>(
        find.widgetWithText(ChoiceChip, l10n.createSubMixed),
      );
      expect(mixed.selected, isTrue);
    });
  });

  group('name validation', () {
    testWidgets('an empty name is reported', (tester) async {
      final l10n = await pump(tester);

      await tapCreate(tester, l10n.createChatAction);

      expect(find.text(l10n.requiredField), findsOneWidget);
      expect(gateway.http.requests, isEmpty);
    });

    testWidgets('typing clears the error', (tester) async {
      final l10n = await pump(tester);
      await tapCreate(tester, l10n.createChatAction);
      expect(find.text(l10n.requiredField), findsOneWidget);

      await typeName(tester, 'General');

      expect(find.text(l10n.requiredField), findsNothing);
    });
  });

  group('creation', () {
    testWidgets('posts the name, type and chat', (tester) async {
      final l10n = await pump(tester, subData: {'id': 1, 'name': 'General'});
      await typeName(tester, 'General');
      await tester.tap(find.text(l10n.createSubText));
      await tester.pump();

      await tapCreate(tester, l10n.createChatAction);

      expect(gateway.http.only.path, '/chat/sub/create');
      expect(gateway.http.only.method, 'POST');
      expect(gateway.http.only.json, {
        'chatUUID': 'chat-1',
        'name': 'General',
        'type': 'TEXT',
      });
    });

    testWidgets('trims the name before posting', (tester) async {
      final l10n = await pump(tester, subData: {'id': 1, 'name': 'General'});
      await typeName(tester, '   General   ');

      await tapCreate(tester, l10n.createChatAction);

      expect(gateway.http.only.json['name'], 'General');
    });

    testWidgets('reports an error when the envelope fails', (tester) async {
      final l10n = await pump(tester, success: false);
      await typeName(tester, 'General');

      await tapCreate(tester, l10n.createChatAction);

      expect(find.text(l10n.createSubError), findsOneWidget);
    });

    testWidgets('reports an error when the sub is missing', (tester) async {
      final l10n = await pump(tester, subData: null);
      await typeName(tester, 'General');

      await tapCreate(tester, l10n.createChatAction);

      expect(find.text(l10n.createSubError), findsOneWidget);
    });

    testWidgets('reports an error when the transport throws', (tester) async {
      final l10n = await pump(tester);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            chatServiceProvider.overrideWithValue(
              ChatService(FakeGateway.offline()),
            ),
          ],
          child: const MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(
              body: SingleChildScrollView(
                child: CreateSubModal(chatUUID: 'chat-1'),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      await typeName(tester, 'General');

      await tapCreate(tester, l10n.createChatAction);

      expect(find.text(l10n.createSubError), findsOneWidget);
    });
  });
}
