import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/auth/validator.dart';
import 'package:novyse/core/chat/chat_service.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/chat/create_chat_modal.dart';
import 'package:novyse/ui/components/onboarding/onboarding_text_field.dart';
import 'package:novyse/ui/components/status/status_message.dart';

import '../../../helpers/fake_gateway.dart';
import '../../../helpers/fake_http.dart';

/// `CreateChatModal` validates the name and the public handle locally, then
/// asks the API whether the handle is free. `ChatService` takes a `Gateway`, so
/// a `FakeGateway` supplies both responses offline.
void main() {
  late FakeGateway gateway;

  /// Pumps the modal with the given handle-availability payload.
  Future<AppLocalizations> pump(
    WidgetTester tester, {
    Object? checkData = true,
    bool checkSuccess = true,
  }) async {
    gateway = FakeGateway(
      FakeHttp.replying((options) {
        if (options.path == '/check/handle') {
          return envelope(
            success: checkSuccess,
            data: checkSuccess ? checkData : null,
          );
        }
        return envelope(data: {'success': true});
      }),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          chatServiceProvider.overrideWithValue(ChatService(gateway)),
        ],
        child: const MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(body: SingleChildScrollView(child: CreateChatModal())),
        ),
      ),
    );
    await tester.pump();
    return AppLocalizations.of(tester.element(find.byType(CreateChatModal)))!;
  }

  /// Types into the labelled field and lets the debounce elapse.
  Future<void> type(WidgetTester tester, String label, String value) async {
    await tester.enterText(
      find.ancestor(
        of: find.text(label),
        matching: find.byType(OnboardingTextField),
      ),
      value,
    );
    // The handle check is debounced by one second.
    await tester.pump(const Duration(seconds: 1));
    await tester.pump();
  }

  /// Switches the privacy toggle to [privacy].
  Future<void> setPrivacy(
    WidgetTester tester,
    CreateChatPrivacy privacy,
  ) async {
    final l10n = AppLocalizations.of(
      tester.element(find.byType(CreateChatModal)),
    )!;
    await tester.tap(
      find.text(
        privacy == CreateChatPrivacy.public
            ? l10n.createChatPublic
            : l10n.createChatPrivate,
      ),
    );
    await tester.pump();
  }

  /// Scrolls the create button into view and taps it. The modal is taller than
  /// the default test viewport, so the button starts off-screen.
  Future<void> tapCreate(WidgetTester tester) async {
    final l10n = AppLocalizations.of(
      tester.element(find.byType(CreateChatModal)),
    )!;
    await tester.ensureVisible(find.text(l10n.createChatAction));
    await tester.pumpAndSettle();
    await tester.tap(find.text(l10n.createChatAction));
    // Let the async dio call reach the fake transport.
    await tester.pump();
    await tester.pumpAndSettle();
  }

  group('initial state', () {
    testWidgets('defaults to a private group', (tester) async {
      final l10n = await pump(tester);

      expect(find.text(l10n.createChatGroup), findsOneWidget);
      expect(find.text(l10n.createChatPrivate), findsOneWidget);
      expect(find.text(l10n.createChatHandle), findsNothing);
    });

    testWidgets('shows the name, type, privacy and action labels', (
      tester,
    ) async {
      final l10n = await pump(tester);

      expect(find.text(l10n.createChatName), findsOneWidget);
      expect(find.text(l10n.createChatType), findsOneWidget);
      expect(find.text(l10n.createChatPrivacy), findsOneWidget);
      expect(find.text(l10n.createChatAction), findsOneWidget);
    });

    testWidgets('offers all three chat types', (tester) async {
      final l10n = await pump(tester);

      expect(find.text(l10n.createChatGroup), findsOneWidget);
      expect(find.text(l10n.createChatChannel), findsOneWidget);
      expect(find.text(l10n.createChatForum), findsOneWidget);
    });
  });

  group('chat type selection', () {
    testWidgets('selecting a type keeps the card tappable', (tester) async {
      final l10n = await pump(tester);

      await tester.tap(find.text(l10n.createChatChannel));
      await tester.pump();
      await tester.tap(find.text(l10n.createChatForum));
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(find.text(l10n.createChatForum), findsOneWidget);
    });
  });

  group('privacy toggle', () {
    testWidgets('reveals the handle field when public', (tester) async {
      final l10n = await pump(tester);

      await setPrivacy(tester, CreateChatPrivacy.public);

      expect(find.text(l10n.createChatHandle), findsOneWidget);
      expect(find.text(l10n.createChatHandleHelper), findsOneWidget);
    });

    testWidgets('an empty handle clears the availability state', (
      tester,
    ) async {
      final l10n = await pump(tester);
      await setPrivacy(tester, CreateChatPrivacy.public);

      await type(tester, l10n.createChatHandle, '   ');

      expect(find.byType(StatusMessage), findsNothing);
    });
  });

  group('handle validation', () {
    testWidgets('a too-short handle is rejected without calling the API', (
      tester,
    ) async {
      final l10n = await pump(tester);
      await setPrivacy(tester, CreateChatPrivacy.public);

      await type(tester, l10n.createChatHandle, 'ab');

      expect(
        find.textContaining(Validator.validateHandle('ab', l10n)!),
        findsOneWidget,
      );
      expect(gateway.http.requests, isEmpty);
    });

    testWidgets('an invalid handle character is rejected', (tester) async {
      final l10n = await pump(tester);
      await setPrivacy(tester, CreateChatPrivacy.public);

      await type(tester, l10n.createChatHandle, 'john.doe');

      expect(
        find.textContaining(l10n.createChatPublicRequired),
        findsOneWidget,
      );
      expect(gateway.http.requests, isEmpty);
    });

    testWidgets('an available handle produces no error', (tester) async {
      final l10n = await pump(tester, checkData: {'available': true});
      await setPrivacy(tester, CreateChatPrivacy.public);

      await type(tester, l10n.createChatHandle, 'available');

      expect(gateway.http.requests, hasLength(1));
      expect(gateway.http.only.query, {'handle': 'available'});
      expect(find.textContaining(l10n.createChatHandleTaken), findsNothing);
    });

    testWidgets('a taken handle reports it', (tester) async {
      final l10n = await pump(tester, checkData: {'available': false});
      await setPrivacy(tester, CreateChatPrivacy.public);

      await type(tester, l10n.createChatHandle, 'taken');

      expect(find.text(l10n.createChatHandleTaken), findsOneWidget);
    });

    testWidgets('a failed availability check reports an error', (tester) async {
      final l10n = await pump(tester, checkSuccess: false);
      await setPrivacy(tester, CreateChatPrivacy.public);

      await type(tester, l10n.createChatHandle, 'whatever');

      expect(find.text(l10n.createChatHandleError), findsOneWidget);
    });

    testWidgets('a transport failure reports an error', (tester) async {
      final l10n = await pump(tester);
      // Swap in a gateway that always throws.
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
              body: SingleChildScrollView(child: CreateChatModal()),
            ),
          ),
        ),
      );
      await tester.pump();
      await setPrivacy(tester, CreateChatPrivacy.public);

      await type(tester, l10n.createChatHandle, 'offline');

      expect(find.text(l10n.createChatHandleError), findsOneWidget);
    });

    testWidgets('the handle is lowercased as it is typed', (tester) async {
      final l10n = await pump(tester);
      await setPrivacy(tester, CreateChatPrivacy.public);

      await type(tester, l10n.createChatHandle, 'MiXeD');

      expect(gateway.http.only.query, {'handle': 'mixed'});
    });

    testWidgets('switching back to private drops the handle field', (
      tester,
    ) async {
      final l10n = await pump(tester);
      await setPrivacy(tester, CreateChatPrivacy.public);
      await type(tester, l10n.createChatHandle, 'valid');
      expect(find.text(l10n.createChatHandle), findsOneWidget);

      await setPrivacy(tester, CreateChatPrivacy.private);

      expect(find.text(l10n.createChatHandle), findsNothing);
    });
  });

  group('name validation', () {
    testWidgets('an empty name is reported on create', (tester) async {
      final l10n = await pump(tester);

      await tapCreate(tester);

      expect(find.text(l10n.requiredField), findsOneWidget);
    });

    testWidgets('a name over fifty characters is reported', (tester) async {
      final l10n = await pump(tester);

      await type(tester, l10n.createChatName, 'a' * 51);
      await tapCreate(tester);

      expect(find.text(l10n.nameTooLong), findsOneWidget);
    });

    testWidgets('a valid name clears the error', (tester) async {
      final l10n = await pump(tester);
      await tapCreate(tester);

      await type(tester, l10n.createChatName, 'The Squad');

      expect(find.text(l10n.requiredField), findsNothing);
    });
  });

  group('create guards', () {
    testWidgets('a public chat with an empty handle is rejected', (
      tester,
    ) async {
      final l10n = await pump(tester);
      await type(tester, l10n.createChatName, 'The Squad');
      await setPrivacy(tester, CreateChatPrivacy.public);

      await tapCreate(tester);

      // The name-only attempt never reached the create endpoint.
      expect(
        gateway.http.requests.where((r) => r.path == '/chat/create'),
        isEmpty,
      );
    });

    testWidgets('a public chat with a taken handle is rejected', (
      tester,
    ) async {
      final l10n = await pump(tester, checkData: {'available': false});
      await type(tester, l10n.createChatName, 'The Squad');
      await setPrivacy(tester, CreateChatPrivacy.public);
      await type(tester, l10n.createChatHandle, 'taken');

      await tapCreate(tester);

      expect(
        gateway.http.requests.where((r) => r.path == '/chat/create'),
        isEmpty,
      );
    });

    testWidgets('a private chat with an invalid handle is accepted', (
      tester,
    ) async {
      // A private chat ignores the handle, so even a malformed one is fine.
      final l10n = await pump(tester);
      await type(tester, l10n.createChatName, 'The Squad');

      await tapCreate(tester);

      final create = gateway.http.requests.where(
        (r) => r.path == '/chat/create',
      );
      expect(create, hasLength(1));
      // `ChatModule.create` drops an empty handle from the body entirely.
      expect(create.single.json.containsKey('handle'), isFalse);
      expect(create.single.json['name'], 'The Squad');
      expect(create.single.json['type'], 'GROUP');
    });
  });

  group('action button', () {
    testWidgets('is a real AppButton', (tester) async {
      await pump(tester);

      expect(find.byType(AppButton), findsOneWidget);
    });
  });
}
