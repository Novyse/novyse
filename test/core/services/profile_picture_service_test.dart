import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/services/profile_picture_service.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/storage/file/file_storage.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  late AppDatabase db;
  late FileStorage storage;
  late ProfilePictureService service;

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();

    storage = FileStorage.instance;
    await storage.clearAll();

    service = ProfilePictureService.instance;
  });

  tearDown(() async {
    await db.close();
    await storage.clearAll();
  });

  group('ProfilePictureService Tests', () {
    test('returns direct uri when provided without hitting database', () async {
      final uri = await service.getProfilePictureUri(
        'any-uuid',
        uri: 'https://example.com/avatar.jpg',
      );
      expect(uri, equals('https://example.com/avatar.jpg'));
    });

    test('returns null for empty or null UUID', () async {
      expect(await service.getProfilePictureUri(null), isNull);
      expect(await service.getProfilePictureUri(''), isNull);
    });

    test(
      'returns existing storage URI when file and DB record are present',
      () async {
        const fileUUID = '00000000-0000-0000-0000-000000000000';
        final bytes = Uint8List.fromList([1, 2, 3, 4, 5]);

        // Save file locally in storage
        final saveResult = await storage.save.byBytes(bytes, fileUUID);
        expect(saveResult.ref, isNotEmpty);

        // Add to database
        await db.file.add(
          fileUUID,
          'test.jpg',
          'image/jpeg',
          bytes.length,
          ref: saveResult.ref,
        );

        // Verify service resolves the file URI
        final resolvedUri = await service.getProfilePictureUri(fileUUID);
        expect(resolvedUri, isNotNull);
        expect(resolvedUri, isNotEmpty);
      },
    );

    test('downloadProfilePicture returns null for empty UUID', () async {
      expect(await service.downloadProfilePicture(''), isNull);
    });
  });
}
