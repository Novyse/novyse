import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/user_store.dart';

void main() {
  final db = AppDatabase.instance;
  const userUUID = 'user-1';

  setUp(() async {
    await db.initialize(inMemory: true);
  });

  tearDown(() async {
    await db.close();
  });

  group('profile fields in the local database', () {
    test('persists core profile fields and customization when present', () async {
      final added = await db.user.add({
        'uuid': userUUID,
        'name': 'Alice',
        'surname': 'A',
        'bannerPictureUUID': 'banner-1',
        'customization': {
          'cardPictureUUID': 'card-1',
          'cardEffect': 'glow',
          'nameFont': 'Inter',
          'bannerColor': {
            'angle': 45,
            'stops': [
              {'color': '#112233', 'position': 0},
            ],
          },
        },
        'profileEventID': 3,
      });

      expect(added, isTrue);

      final row = await db.user.get.byUUID(userUUID);
      expect(row, isNotNull);
      expect(row!['bannerPictureUUID'], 'banner-1');
      expect(row['cardPictureUUID'], 'card-1');
      expect(row['cardEffect'], 'glow');
      expect(row['nameFont'], 'Inter');
      expect(row['bannerColor'], isA<String>());
      final banner = jsonDecode(row['bannerColor'] as String) as Map;
      expect(banner['angle'], 45);

      final model = UserModel.fromMap(row);
      expect(model.bannerColor?.angle, 45);
      expect(model.cardPictureUUID, 'card-1');
      expect(model.bannerPictureUUID, 'banner-1');
    });

    test('a partial user payload does not drop the profile fields', () async {
      await db.user.add({
        'uuid': userUUID,
        'name': 'Alice',
        'bannerPictureUUID': 'banner-1',
        'cardPictureUUID': 'card-1',
        'profileEventID': 3,
      });

      // What a chat member event sends: the name alone.
      await db.user.add({'uuid': userUUID, 'name': 'Alice'});

      final row = await db.user.get.byUUID(userUUID);
      expect(row!['bannerPictureUUID'], 'banner-1');
      expect(row['cardPictureUUID'], 'card-1');
      expect(row['profileEventID'], 3);
    });

    test(
      'an explicit null clears a field and advances the event cursor',
      () async {
        await db.user.add({
          'uuid': userUUID,
          'name': 'Alice',
          'bannerPictureUUID': 'banner-1',
          'bannerColor': {
            'angle': 0,
            'stops': [
              {'color': '#112233', 'position': 0},
            ],
          },
        });

        final events = <UserProfileUpdateEvent>[];
        final subscription = EventBus.instance
            .on<UserProfileUpdateEvent>()
            .listen(events.add);
        addTearDown(subscription.cancel);

        await GlobalEventEmitter.instance.user.profile.update({
          'userUUID': userUUID,
          'bannerPictureUUID': null,
          'bannerColor': null,
        }, 9);

        final row = await db.user.get.byUUID(userUUID);
        expect(row!['bannerPictureUUID'], isNull);
        expect(row['bannerColor'], isNull);
        expect(row['profileEventID'], 9);
        expect(events, hasLength(1));
        expect(events.single.userUUID, userUUID);
        expect(events.single.data.containsKey('bannerColor'), isTrue);
      },
    );
  });

  group('UserModel.mergeProfile', () {
    test('keeps untouched fields and clears the ones sent as null', () {
      const user = UserModel(
        uuid: userUUID,
        name: 'Alice',
        biography: 'hello',
        bannerPictureUUID: 'banner-1',
      );

      final merged = user.mergeProfile({
        'name': 'Bob',
        'bannerPictureUUID': null,
        'bannerColor': {
          'angle': 90,
          'stops': [
            {'color': '#000000', 'position': 0},
          ],
        },
      });

      expect(merged.name, 'Bob');
      expect(merged.biography, 'hello');
      expect(merged.bannerPictureUUID, isNull);
      expect(merged.bannerColor?.angle, 90);
    });

    test('reads a customization map from the API payload', () {
      const user = UserModel(uuid: userUUID, name: 'Alice');

      final merged = user.mergeProfile({
        'customization': {
          'nameColor': {
            'angle': 0,
            'stops': [
              {'color': '#abcdef', 'position': 0},
            ],
          },
          'avatarBorder': 'neon',
        },
      });

      expect(merged.nameColor?.stops.single.color, '#abcdef');
      expect(merged.avatarBorder, 'neon');
      expect(merged.name, 'Alice');
    });
  });
}
