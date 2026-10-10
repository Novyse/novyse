import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:novyse/core/l10n/app_localizations_en.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/chat_list/message_search_tile.dart';

/// `MessageSearchTile` projects one search hit: the chat name resolved through
/// the chat/user stores, the sender name, and a query-highlighted snippet.
class _StubUserNotifier extends UserNotifier {
  @override
  UserStoreState build() => const UserStoreState(
    localUserUUID: 'me',
    users: {'u1': UserModel(uuid: 'u1', name: 'Ada', surname: 'Lovelace')},
  );
}

void main() {
  final en = AppLocalizationsEn();

  /// A group chat so the name comes straight from the model.
  const groupChat = ChatModel(
    uuid: 'chat-1',
    name: 'The Squad',
    type: 'GROUP',
    members: [],
  );

  /// Pumps one search result tile.
  Future<void> pump(
    WidgetTester tester, {
    required Map<String, dynamic> result,
    String query = '',
    ChatModel? chat,
    VoidCallback? onTap,
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          userStoreProvider.overrideWith(_StubUserNotifier.new),
          if (chat != null) chatProvider(chat.uuid).overrideWithValue(chat),
        ],
        child: MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: MessageSearchTile(result: result, query: query, onTap: onTap),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  setUpAll(() => initializeDateFormatting('en', null));

  group('chat name', () {
    testWidgets('uses the chat model name for a group', (tester) async {
      await pump(
        tester,
        result: const {'chatUUID': 'chat-1', 'content': 'hello'},
        chat: groupChat,
      );

      expect(find.text('The Squad'), findsOneWidget);
    });

    testWidgets('falls back to the unknown-chat label', (tester) async {
      await pump(
        tester,
        result: const {'chatUUID': 'chat-missing', 'content': 'hello'},
      );

      expect(find.text(en.chatUnknown), findsWidgets);
    });

    testWidgets('resolves a DM to the other participant', (tester) async {
      await pump(
        tester,
        result: const {'chatUUID': 'chat-dm', 'content': 'hello'},
        chat: const ChatModel(
          uuid: 'chat-dm',
          name: 'ignored',
          type: 'DM',
          members: [
            {'uuid': 'me'},
            {'uuid': 'u1'},
          ],
        ),
      );

      expect(find.text('Ada Lovelace'), findsOneWidget);
    });

    testWidgets('a DM with only the local user is saved messages', (
      tester,
    ) async {
      await pump(
        tester,
        result: const {'chatUUID': 'chat-dm', 'content': 'hello'},
        chat: const ChatModel(
          uuid: 'chat-dm',
          name: 'ignored',
          type: 'DM',
          members: [
            {'uuid': 'me'},
          ],
        ),
      );

      expect(find.text(en.savedMessages), findsOneWidget);
    });
  });

  group('sender name', () {
    testWidgets('resolves the sender from the user store', (tester) async {
      await pump(
        tester,
        result: const {
          'chatUUID': 'chat-1',
          'senderUUID': 'u1',
          'content': 'hello',
        },
        chat: groupChat,
      );

      expect(find.text('Ada Lovelace'), findsWidgets);
    });

    testWidgets('falls back to the sender_name field', (tester) async {
      await pump(
        tester,
        result: const {
          'chatUUID': 'chat-1',
          'senderUUID': 'ghost',
          'sender_name': 'Ghost User',
          'content': 'hello',
        },
        chat: groupChat,
      );

      expect(find.text('Ghost User'), findsOneWidget);
    });

    testWidgets('falls back to the unknown label', (tester) async {
      await pump(
        tester,
        result: const {
          'chatUUID': 'chat-1',
          'senderUUID': 'ghost',
          'content': 'hello',
        },
        chat: groupChat,
      );

      expect(find.text(en.chatUnknown), findsWidgets);
    });

    testWidgets('ignores an empty sender_name', (tester) async {
      await pump(
        tester,
        result: const {
          'chatUUID': 'chat-1',
          'senderUUID': 'ghost',
          'sender_name': '',
          'content': 'hello',
        },
        chat: groupChat,
      );

      expect(find.text(en.chatUnknown), findsWidgets);
    });
  });

  group('content snippet', () {
    testWidgets('flattens newlines into spaces', (tester) async {
      await pump(
        tester,
        result: const {'chatUUID': 'chat-1', 'content': 'line one\nline two'},
        chat: groupChat,
      );

      expect(find.textContaining('line one line two'), findsOneWidget);
    });

    testWidgets('renders an empty snippet for missing content', (tester) async {
      await pump(tester, result: const {'chatUUID': 'chat-1'}, chat: groupChat);

      expect(tester.takeException(), isNull);
    });

    testWidgets('highlights the query inside the snippet', (tester) async {
      await pump(
        tester,
        result: const {'chatUUID': 'chat-1', 'content': 'the needle is here'},
        query: 'needle',
        chat: groupChat,
      );

      final rich = tester.widget<Text>(find.byType(Text).last);
      expect(rich.textSpan!.toPlainText(), 'the needle is here');
    });

    testWidgets('leaves the snippet plain when the query is empty', (
      tester,
    ) async {
      await pump(
        tester,
        result: const {'chatUUID': 'chat-1', 'content': 'nothing to highlight'},
        query: '',
        chat: groupChat,
      );

      final rich = tester.widget<Text>(find.byType(Text).last);
      expect(rich.textSpan!.toPlainText(), 'nothing to highlight');
    });

    testWidgets('matches the query case-insensitively', (tester) async {
      await pump(
        tester,
        result: const {'chatUUID': 'chat-1', 'content': 'A NEEDLE here'},
        query: 'needle',
        chat: groupChat,
      );

      final rich = tester.widget<Text>(find.byType(Text).last);
      expect(rich.textSpan!.toPlainText(), 'A NEEDLE here');
    });
  });

  group('timestamp', () {
    testWidgets('shows only the time for today', (tester) async {
      final now = DateTime.now();
      await pump(
        tester,
        result: {
          'chatUUID': 'chat-1',
          'content': 'hello',
          'created_at': now
              .subtract(const Duration(minutes: 5))
              .toIso8601String(),
        },
        chat: groupChat,
      );

      final expected =
          '${now.subtract(const Duration(minutes: 5)).hour.toString().padLeft(2, '0')}:'
          '${now.subtract(const Duration(minutes: 5)).minute.toString().padLeft(2, '0')}';
      expect(find.text(expected), findsOneWidget);
    });

    testWidgets('shows a date for an older message', (tester) async {
      final old = DateTime.now().subtract(const Duration(days: 10));
      await pump(
        tester,
        result: {
          'chatUUID': 'chat-1',
          'content': 'hello',
          'created_at': old.toIso8601String(),
        },
        chat: groupChat,
      );

      // A localized short date, not a bare time.
      expect(find.textContaining('${old.day}'), findsOneWidget);
    });

    testWidgets('accepts the createdAt key too', (tester) async {
      final now = DateTime.now().subtract(const Duration(minutes: 5));
      await pump(
        tester,
        result: {
          'chatUUID': 'chat-1',
          'content': 'hello',
          'createdAt': now.toIso8601String(),
        },
        chat: groupChat,
      );

      expect(find.textContaining(':'), findsWidgets);
    });

    testWidgets('shows nothing for a missing timestamp', (tester) async {
      await pump(
        tester,
        result: const {'chatUUID': 'chat-1', 'content': 'hello'},
        chat: groupChat,
      );

      expect(find.text('The Squad'), findsOneWidget);
    });

    testWidgets('shows nothing for an unparseable timestamp', (tester) async {
      await pump(
        tester,
        result: const {
          'chatUUID': 'chat-1',
          'content': 'hello',
          'created_at': 'not-a-date',
        },
        chat: groupChat,
      );

      expect(tester.takeException(), isNull);
    });
  });

  group('tap', () {
    testWidgets('fires onTap', (tester) async {
      var taps = 0;
      await pump(
        tester,
        result: const {'chatUUID': 'chat-1', 'content': 'hello'},
        chat: groupChat,
        onTap: () => taps++,
      );

      await tester.tap(find.byType(MessageSearchTile));
      await tester.pump();

      expect(taps, 1);
    });

    testWidgets('is harmless without an onTap', (tester) async {
      await pump(
        tester,
        result: const {'chatUUID': 'chat-1', 'content': 'hello'},
        chat: groupChat,
      );

      await tester.tap(find.byType(MessageSearchTile));
      await tester.pump();

      expect(tester.takeException(), isNull);
    });
  });
}
