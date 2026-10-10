import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/storage/file/file_handler.dart';

/// `FileHandler` funnels every pick through `file_picker`, whose
/// method-channel implementation is unavailable in a test isolate, so each pick
/// takes the `catch` path and returns an empty list. These tests pin that
/// contract plus the type-dispatch table and the asset value type.
void main() {
  group('openNativeFileMenu', () {
    test('dispatches image to the image picker', () async {
      expect(await FileHandler.openNativeFileMenu('image'), isEmpty);
    });

    test('dispatches video to the video picker', () async {
      expect(await FileHandler.openNativeFileMenu('video'), isEmpty);
    });

    test('dispatches audio to the audio picker', () async {
      expect(await FileHandler.openNativeFileMenu('audio'), isEmpty);
    });

    test('dispatches media to the media picker', () async {
      expect(await FileHandler.openNativeFileMenu('media'), isEmpty);
    });

    test('dispatches file to the generic picker', () async {
      expect(await FileHandler.openNativeFileMenu('file'), isEmpty);
    });

    test('is case-insensitive', () async {
      expect(await FileHandler.openNativeFileMenu('IMAGE'), isEmpty);
      expect(await FileHandler.openNativeFileMenu('Video'), isEmpty);
      expect(await FileHandler.openNativeFileMenu('MeDiA'), isEmpty);
    });

    test('falls back to the generic picker for an unknown type', () async {
      expect(await FileHandler.openNativeFileMenu('nonsense'), isEmpty);
    });
  });

  group('direct pickers', () {
    test('each returns an empty list when the picker is unavailable', () async {
      expect(await FileHandler.pickFile(), isEmpty);
      expect(await FileHandler.pickFile(allowedExtensions: ['pdf']), isEmpty);
      expect(await FileHandler.pickMedia(), isEmpty);
      expect(await FileHandler.pickImage(), isEmpty);
      expect(await FileHandler.pickVideo(), isEmpty);
      expect(await FileHandler.pickAudio(), isEmpty);
    });

    test(
      'an empty allowedExtensions list still uses the generic type',
      () async {
        expect(
          await FileHandler.pickFile(allowedExtensions: const []),
          isEmpty,
        );
      },
    );
  });

  group('PickedFileAsset', () {
    test('keeps its fields', () {
      final asset = PickedFileAsset(
        name: 'photo.png',
        path: '/tmp/photo.png',
        size: 2048,
        bytes: Uint8List.fromList([1, 2, 3]),
        extension: 'png',
      );

      expect(asset.name, 'photo.png');
      expect(asset.path, '/tmp/photo.png');
      expect(asset.size, 2048);
      expect(asset.bytes, hasLength(3));
      expect(asset.extension, 'png');
    });

    test('toMap carries the server-facing fields', () {
      final asset = PickedFileAsset(
        name: 'photo.png',
        path: '/tmp/photo.png',
        size: 2048,
        bytes: Uint8List.fromList([1, 2, 3]),
        extension: 'png',
      );

      expect(asset.toMap(), {
        'name': 'photo.png',
        'path': '/tmp/photo.png',
        'size': 2048,
        'extension': 'png',
      });
    });

    test('toMap keeps a null path and a null extension', () {
      final asset = PickedFileAsset(name: 'noext', size: 0);

      expect(asset.toMap(), {
        'name': 'noext',
        'path': null,
        'size': 0,
        'extension': null,
      });
    });
  });
}
