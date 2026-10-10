import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/ui/components/chat/chat_overview/overview_collectors.dart';
import 'package:novyse/ui/components/chat/chat_overview/overview_rows.dart';

/// The overview rows are presentation-only: a file tile, a link tile and an
/// empty state. They need a localized [MaterialApp] and nothing else.
void main() {
  MessageModel message({String? content, int id = 1}) => MessageModel(
    id: id,
    chatUUID: 'chat-1',
    userUUID: 'u1',
    content: content,
    type: 'message',
    createdAt: DateTime(2026, 1, 1),
  );

  setUp(() {
    // The long-press handler writes to the system clipboard first.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, (call) => null);
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, null);
  });

  /// Pumps [child] inside a localized app and returns the localized strings.
  Future<AppLocalizations> pump(WidgetTester tester, Widget child) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(body: child),
      ),
    );
    return AppLocalizations.of(tester.element(find.byType(Scaffold).first))!;
  }

  group('OverviewFileRow', () {
    testWidgets('shows the file name and size', (tester) async {
      final l10n = await pump(
        tester,
        OverviewFileRow(
          chatUUID: 'chat-1',
          entry: FileEntry(
            file: {
              'name': 'report.pdf',
              'size': 2048,
              'mimeType': 'application/pdf',
            },
            createdAt: DateTime(2026, 1, 1),
          ),
        ),
      );

      expect(find.text('report.pdf'), findsOneWidget);
      expect(find.text('2.0 KB'), findsOneWidget);
      expect(l10n, isNotNull);
    });

    testWidgets('falls back to a placeholder name', (tester) async {
      final l10n = await pump(
        tester,
        OverviewFileRow(
          chatUUID: 'chat-1',
          entry: FileEntry(
            file: const <String, dynamic>{},
            createdAt: DateTime(2026, 1, 1),
          ),
        ),
      );

      expect(find.text(l10n.overviewUnknownFile), findsOneWidget);
    });

    testWidgets('accepts the fileName key', (tester) async {
      await pump(
        tester,
        OverviewFileRow(
          chatUUID: 'chat-1',
          entry: FileEntry(
            file: const {'fileName': 'via-filename.png'},
            createdAt: DateTime(2026, 1, 1),
          ),
        ),
      );

      expect(find.text('via-filename.png'), findsOneWidget);
    });

    testWidgets('leaves the size subtitle empty when there is none', (
      tester,
    ) async {
      await pump(
        tester,
        OverviewFileRow(
          chatUUID: 'chat-1',
          entry: FileEntry(
            file: const {'name': 'a.bin'},
            createdAt: DateTime(2026, 1, 1),
          ),
        ),
      );

      expect(find.text(''), findsOneWidget);
    });

    testWidgets('tapping the row shows the work-in-progress snackbar', (
      tester,
    ) async {
      final l10n = await pump(
        tester,
        OverviewFileRow(
          chatUUID: 'chat-1',
          entry: FileEntry(
            file: const {'name': 'a.pdf', 'mimeType': 'application/pdf'},
            createdAt: DateTime(2026, 1, 1),
          ),
        ),
      );

      await tester.tap(find.text('a.pdf'));
      await tester.pump();

      expect(find.text(l10n.overviewWip), findsOneWidget);
    });

    testWidgets('the download button shows the same snackbar', (tester) async {
      final l10n = await pump(
        tester,
        OverviewFileRow(
          chatUUID: 'chat-1',
          entry: FileEntry(
            file: const {'name': 'a.pdf', 'mimeType': 'application/pdf'},
            createdAt: DateTime(2026, 1, 1),
          ),
        ),
      );

      await tester.tap(find.byType(IconButton));
      await tester.pump();

      expect(find.text(l10n.overviewWip), findsOneWidget);
    });
  });

  group('OverviewLinkRow', () {
    testWidgets('shows the url', (tester) async {
      await pump(
        tester,
        OverviewLinkRow(
          url: 'https://novyse.app',
          message: message(content: 'https://novyse.app'),
        ),
      );

      expect(find.text('https://novyse.app'), findsOneWidget);
    });

    testWidgets('adds a preview line when the message says more', (
      tester,
    ) async {
      await pump(
        tester,
        OverviewLinkRow(
          url: 'https://novyse.app',
          message: message(content: 'look at https://novyse.app'),
        ),
      );

      expect(find.text('look at https://novyse.app'), findsOneWidget);
    });

    testWidgets('omits the preview when the message is only the url', (
      tester,
    ) async {
      await pump(
        tester,
        OverviewLinkRow(
          url: 'https://novyse.app',
          message: message(content: 'https://novyse.app'),
        ),
      );

      // A single ListTile with no subtitle.
      final tile = tester.widget<ListTile>(find.byType(ListTile));
      expect(tile.subtitle, isNull);
    });

    testWidgets('falls back to the url when the message has no content', (
      tester,
    ) async {
      await pump(
        tester,
        OverviewLinkRow(url: 'https://novyse.app', message: message()),
      );

      expect(find.text('https://novyse.app'), findsOneWidget);
    });

    testWidgets('a long press copies the url and confirms it', (tester) async {
      final l10n = await pump(
        tester,
        OverviewLinkRow(
          url: 'https://novyse.app',
          message: message(content: 'https://novyse.app'),
        ),
      );

      await tester.longPress(find.text('https://novyse.app'));
      // The clipboard write is a platform-channel round trip before the
      // snackbar is shown.
      await tester.pumpAndSettle();

      expect(find.text(l10n.copy), findsOneWidget);
    });

    testWidgets('a tap on an unparseable url does nothing', (tester) async {
      await pump(
        tester,
        OverviewLinkRow(url: '::not a uri::', message: message()),
      );

      await tester.tap(find.text('::not a uri::'));
      await tester.pump();

      expect(tester.takeException(), isNull);
    });
  });

  group('OverviewEmptyState', () {
    testWidgets('shows the icon and the text', (tester) async {
      await pump(
        tester,
        const OverviewEmptyState(
          icon: Icons.folder_off_outlined,
          text: 'Nothing here',
        ),
      );

      expect(find.byIcon(Icons.folder_off_outlined), findsOneWidget);
      expect(find.text('Nothing here'), findsOneWidget);
    });
  });
}
