import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/favorite_messages_store.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// `FavoriteMessagesNotifier` lazily loads the `favorite_message` table and
/// keeps it in sync with the bus. With an in-memory database the whole
/// load/remove/reload cycle is exercisable.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase db;

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();
  });

  tearDown(() async {
    await db.close();
  });

  /// Seeds a message and marks it as a favorite.
  Future<void> seedFavorite({
    required String chatUUID,
    int subID = 0,
    int messageID = 1,
    String? content,
  }) async {
    await db.message.add({
      'id': messageID,
      'chatUUID': chatUUID,
      'subID': subID,
      'senderUUID': 'u1',
      'content': content ?? 'fav $messageID',
      'type': 'message',
    });
    await db.message.favorite.add(chatUUID, subID, messageID);
  }

  /// Polls until [condition] holds.
  ///
  /// The store reads SQLite over sqflite's FFI bridge, so a fixed delay is not
  /// reliable under parallel test execution or coverage instrumentation.
  Future<void> waitFor(
    bool Function() condition, {
    Duration timeout = const Duration(seconds: 5),
  }) async {
    final deadline = DateTime.now().add(timeout);
    while (!condition()) {
      if (DateTime.now().isAfter(deadline)) {
        fail('Timed out after ${timeout.inSeconds}s waiting for the condition');
      }
      await Future<void>.delayed(const Duration(milliseconds: 5));
    }
  }

  FavoriteMessagesState read(ProviderContainer container, String? chatUUID) =>
      container.read(favoriteMessagesProvider(chatUUID));

  /// Reads a notifier and lets the lazy-load microtask finish.
  Future<FavoriteMessagesNotifier> watch(
    ProviderContainer container,
    String? chatUUID,
  ) async {
    final notifier = container.read(
      favoriteMessagesProvider(chatUUID).notifier,
    );
    container.read(favoriteMessagesProvider(chatUUID));
    await waitFor(() => !read(container, chatUUID).loading);
    return notifier;
  }

  group('init', () {
    test('loads favorites for every chat', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 1);
      await seedFavorite(chatUUID: 'chat-2', messageID: 2);
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await watch(container, null);

      expect(read(container, null).favorites, hasLength(2));
      expect(read(container, null).loading, isFalse);
    });

    test('filters by chat', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 1);
      await seedFavorite(chatUUID: 'chat-2', messageID: 2);
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await watch(container, 'chat-1');

      expect(read(container, 'chat-1').favorites.map((m) => m.chatUUID), [
        'chat-1',
      ]);
    });

    test('starts empty and finishes loading', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      // Before the lazy microtask the state is loading with no favorites.
      container.read(favoriteMessagesProvider(null));
      expect(read(container, null).loading, isTrue);
      expect(read(container, null).favorites, isEmpty);

      await waitFor(() => !read(container, null).loading);
      expect(read(container, null).loading, isFalse);
    });

    test('is idempotent', () async {
      await seedFavorite(chatUUID: 'chat-1');
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = await watch(container, null);

      await notifier.init();
      await notifier.init();

      expect(read(container, null).favorites, hasLength(1));
    });
  });

  group('clear', () {
    test('resets the state and allows a reload', () async {
      await seedFavorite(chatUUID: 'chat-1');
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = await watch(container, null);
      expect(read(container, null).favorites, hasLength(1));

      notifier.clear();

      expect(read(container, null).favorites, isEmpty);
      expect(read(container, null).loading, isFalse);

      await notifier.init();
      expect(read(container, null).favorites, hasLength(1));
    });
  });

  group('reload', () {
    test('picks up a favorite added after the first load', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = await watch(container, null);
      expect(read(container, null).favorites, isEmpty);

      await seedFavorite(chatUUID: 'chat-1', messageID: 7);
      await notifier.reload();

      expect(read(container, null).favorites, hasLength(1));
    });

    test('survives a closed database', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = await watch(container, null);
      await notifier.reload();
      await db.close();

      await expectLater(notifier.reload(), completes);
    });
  });

  group('FavoriteMessageUpdateEvent', () {
    test('favorite_remove drops the message from the list', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 5);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      await watch(container, null);

      EventBus.instance.emit(
        const FavoriteMessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 0,
          messageID: '5',
          action: 'favorite_remove',
          data: {},
        ),
      );
      await waitFor(() => read(container, null).favorites.isEmpty);

      expect(read(container, null).favorites, isEmpty);
    });

    test('favorite_remove leaves other messages alone', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 5);
      await seedFavorite(chatUUID: 'chat-1', messageID: 6);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      await watch(container, null);

      EventBus.instance.emit(
        const FavoriteMessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 0,
          messageID: '5',
          action: 'favorite_remove',
          data: {},
        ),
      );
      await waitFor(
        () =>
            read(
              container,
              null,
            ).favorites.map((m) => m.id.toString()).join() ==
            '6',
      );

      expect(read(container, null).favorites.map((m) => m.id.toString()), [
        '6',
      ]);
    });

    test('a remove for a different sub does not drop the message', () async {
      await seedFavorite(chatUUID: 'chat-1', subID: 0, messageID: 5);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      await watch(container, null);

      EventBus.instance.emit(
        const FavoriteMessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 3,
          messageID: '5',
          action: 'favorite_remove',
          data: {},
        ),
      );
      await waitFor(() => read(container, null).favorites.length == 1);

      expect(read(container, null).favorites, hasLength(1));
    });

    test('favorite_add reloads from the database', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      await watch(container, null);
      await seedFavorite(chatUUID: 'chat-1', messageID: 8);

      EventBus.instance.emit(
        const FavoriteMessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 0,
          messageID: '8',
          action: 'favorite_add',
          data: {},
        ),
      );
      await waitFor(() => read(container, null).favorites.length == 1);

      expect(read(container, null).favorites, hasLength(1));
    });

    test('a per-chat notifier ignores another chat event', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 5);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      await watch(container, 'chat-1');

      EventBus.instance.emit(
        const FavoriteMessageUpdateEvent(
          chatUUID: 'chat-OTHER',
          subID: 0,
          messageID: '5',
          action: 'favorite_remove',
          data: {},
        ),
      );
      await waitFor(
        () => read(container, 'chat-1').favorites.length == 1,
        timeout: const Duration(milliseconds: 300),
      );

      expect(read(container, 'chat-1').favorites, hasLength(1));
    });

    test('the global notifier reacts to any chat', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 5);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      await watch(container, null);

      EventBus.instance.emit(
        const FavoriteMessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 0,
          messageID: '5',
          action: 'favorite_remove',
          data: {},
        ),
      );
      await waitFor(() => read(container, null).favorites.isEmpty);

      expect(read(container, null).favorites, isEmpty);
    });
  });

  group('MessageUpdateEvent', () {
    test('favorite_remove drops the message', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 5);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      await watch(container, null);

      EventBus.instance.emit(
        const MessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 0,
          messageID: '5',
          action: 'favorite_remove',
          data: {},
        ),
      );
      await waitFor(() => read(container, null).favorites.isEmpty);

      expect(read(container, null).favorites, isEmpty);
    });

    test('a non-favorite action is ignored', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 5);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      await watch(container, null);

      EventBus.instance.emit(
        const MessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 0,
          messageID: '5',
          action: 'edit',
          data: {},
        ),
      );
      await waitFor(
        () => read(container, 'chat-1').favorites.length == 1,
        timeout: const Duration(milliseconds: 300),
      );

      expect(read(container, 'chat-1').favorites, hasLength(1));
    });

    test('a per-chat notifier ignores another chat', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 5);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      await watch(container, 'chat-1');

      EventBus.instance.emit(
        const MessageUpdateEvent(
          chatUUID: 'chat-OTHER',
          subID: 0,
          messageID: '5',
          action: 'favorite_remove',
          data: {},
        ),
      );
      await waitFor(
        () => read(container, 'chat-1').favorites.length == 1,
        timeout: const Duration(milliseconds: 300),
      );

      expect(read(container, 'chat-1').favorites, hasLength(1));
    });
  });

  group('applyLocalFavorite', () {
    test('favorited true reloads the list', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = await watch(container, null);
      await seedFavorite(chatUUID: 'chat-1', messageID: 9);

      notifier.applyLocalFavorite('chat-1', 0, '9', true);
      await waitFor(() => read(container, null).favorites.length == 1);

      expect(read(container, null).favorites, hasLength(1));
    });

    test('favorited false removes the message immediately', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 9);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = await watch(container, null);
      expect(read(container, null).favorites, hasLength(1));

      notifier.applyLocalFavorite('chat-1', 0, '9', false);

      expect(read(container, null).favorites, isEmpty);
    });

    test('favorited false keeps a different message', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 9);
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = await watch(container, null);

      notifier.applyLocalFavorite('chat-1', 3, '9', false);

      expect(read(container, null).favorites, hasLength(1));
    });
  });

  group('disposal', () {
    test('cancels its bus subscriptions', () async {
      await seedFavorite(chatUUID: 'chat-1', messageID: 5);
      final container = ProviderContainer();
      final notifier = await watch(container, null);
      expect(read(container, null).favorites, hasLength(1));

      container.dispose();

      // The listener is gone, so this must not touch a disposed notifier.
      EventBus.instance.emit(
        const FavoriteMessageUpdateEvent(
          chatUUID: 'chat-1',
          subID: 0,
          messageID: '5',
          action: 'favorite_remove',
          data: {},
        ),
      );
      await Future<void>.delayed(const Duration(milliseconds: 30));

      expect(notifier, isNotNull);
    });
  });
}
