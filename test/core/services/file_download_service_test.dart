import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/services/file_download_service.dart';
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
  late FileDownloadService service;

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();

    storage = FileStorage.instance;
    service = FileDownloadService.instance;
  });

  tearDown(() async {
    await db.close();
    await storage.delete('doc_123.pdf');
    await storage.delete('uuid-stored-in-db-456.jpg');
  });

  group('FileDownloadService Tests', () {
    test('downloadFile returns null for empty UUID', () async {
      expect(await service.downloadFile(fileUUID: ''), isNull);
    });

    test(
      'getOrDownloadFile returns null for empty UUID when not downloading',
      () async {
        expect(
          await service.getOrDownloadFile(fileUUID: '', autoDownload: false),
          isNull,
        );
      },
    );

    test(
      'getOrDownloadFile returns local URI when ref exists in storage',
      () async {
        final bytes = Uint8List.fromList([10, 20, 30, 40]);
        final saveResult = await storage.save.byBytes(bytes, 'doc_123.pdf');

        final resolvedUri = await service.getOrDownloadFile(
          fileUUID: 'file-doc-123',
          ref: saveResult.ref,
          autoDownload: false,
        );

        expect(resolvedUri, isNotNull);
        expect(resolvedUri, contains('doc_123.pdf'));
      },
    );

    test('getOrDownloadFile resolves from SQLite database ref', () async {
      const fileUUID = 'uuid-stored-in-db-456';
      final bytes = Uint8List.fromList([1, 2, 3, 4, 5, 6]);
      final saveResult = await storage.save.byBytes(bytes, '$fileUUID.jpg');

      await db.file.add(
        fileUUID,
        'image.jpg',
        'image/jpeg',
        bytes.length,
        ref: saveResult.ref,
      );

      final resolvedUri = await service.getOrDownloadFile(
        fileUUID: fileUUID,
        autoDownload: false,
      );

      expect(resolvedUri, isNotNull);
      expect(resolvedUri, contains(fileUUID));
    });
  });
}
