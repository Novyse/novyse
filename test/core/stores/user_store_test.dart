import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  late AppDatabase db;
  late ProviderContainer container;

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();
    container = ProviderContainer(
      overrides: [databaseProvider.overrideWithValue(db)],
    );
  });

  tearDown(() async {
    container.dispose();
    await db.close();
  });

  group('UserStore Tests', () {
    test('init loads users from database', () async {
      await db.user.add({
        'uuid': 'user-1',
        'name': 'Alice',
        'surname': 'Wonder',
        'handle': 'alice',
      });

      final notifier = container.read(userStoreProvider.notifier);
      await notifier.init(fetchPresence: false);

      final state = container.read(userStoreProvider);
      expect(state.users.containsKey('user-1'), isTrue);

      final user = container.read(userProvider('user-1'));
      expect(user?.name, equals('Alice'));
      expect(user?.displayName, equals('Alice Wonder'));
      expect(user?.handle, equals('alice'));
      expect(user?.status, equals('OFFLINE'));

      expect(notifier.getUserByHandle('ALICE')?.uuid, equals('user-1'));
    });

    test('onProfileUpdate and onPresenceUpdate update user in memory and reactive provider', () async {
      await db.user.add({'uuid': 'user-2', 'name': 'Bob', 'handle': 'bob'});

      final notifier = container.read(userStoreProvider.notifier);
      await notifier.init(fetchPresence: false);

      final bus = container.read(eventBusProvider);

      bus.emit(
        const UserProfileUpdateEvent(
          userUUID: 'user-2',
          data: {'name': 'Robert', 'biography': 'Hello!'},
        ),
      );

      // Allow event bus stream to process
      await Future<void>.delayed(const Duration(milliseconds: 10));

      final updatedUser = container.read(userProvider('user-2'));
      expect(updatedUser?.name, equals('Robert'));
      expect(updatedUser?.biography, equals('Hello!'));

      bus.emit(
        const UserPresenceUpdateEvent(
          userUUID: 'user-2',
          status: 'ONLINE',
          lastAccessAt: '2026-08-31T12:00:00.000Z',
        ),
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));

      final onlineUser = container.read(userProvider('user-2'));
      expect(onlineUser?.status, equals('ONLINE'));
      expect(onlineUser?.lastAccessAt, isNotNull);
    });

    test('onNewChat and onNewMember add users to store', () async {
      final notifier = container.read(userStoreProvider.notifier);
      await notifier.init(fetchPresence: false);

      final bus = container.read(eventBusProvider);

      bus.emit(
        const ChatNewEvent(
          chat: {'uuid': 'chat-1', 'name': 'Group'},
          users: [
            {'uuid': 'user-3', 'name': 'Charlie', 'handle': 'charlie'},
          ],
        ),
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(container.read(userProvider('user-3'))?.name, equals('Charlie'));

      bus.emit(
        const ChatMemberJoinedEvent(
          chatUUID: 'chat-1',
          user: {'uuid': 'user-4', 'name': 'David', 'handle': 'david'},
        ),
      );

      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(container.read(userProvider('user-4'))?.name, equals('David'));
    });
  });
}
