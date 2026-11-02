import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/image_crop/image_crop.dart';

void main() {
  const wide = Size(200, 100);
  const square = Size(100, 100);

  group('initialNormalizedCrop', () {
    test('circle on a wide image is the centered square', () {
      final crop = initialNormalizedCrop(wide, shape: ImageCropShape.circle);

      expect(crop.left, closeTo(0.25, 0.001));
      expect(crop.top, closeTo(0, 0.001));
      expect(crop.width, closeTo(0.5, 0.001));
      expect(crop.height, closeTo(1, 0.001));
      expect(
        crop.width * wide.width,
        closeTo(crop.height * wide.height, 0.001),
      );
    });

    test('square ignores a requested ratio and stays 1:1', () {
      final crop = initialNormalizedCrop(
        square,
        shape: ImageCropShape.square,
        aspectRatio: 2,
      );

      expect(crop, const Rect.fromLTWH(0, 0, 1, 1));
      expect(cropAspectRatio(ImageCropShape.square, 2), 1);
      expect(cropAspectRatio(ImageCropShape.circle, 2), 1);
    });

    test('rectangle can lock a ratio or cover the whole image', () {
      final locked = initialNormalizedCrop(
        square,
        shape: ImageCropShape.rectangle,
        aspectRatio: 2,
      );
      expect(locked.left, closeTo(0, 0.001));
      expect(locked.top, closeTo(0.25, 0.001));
      expect(locked.width, closeTo(1, 0.001));
      expect(locked.height, closeTo(0.5, 0.001));

      final free = initialNormalizedCrop(wide, shape: ImageCropShape.rectangle);
      expect(free, const Rect.fromLTWH(0, 0, 1, 1));
      expect(cropAspectRatio(ImageCropShape.rectangle, null), isNull);
    });
  });

  group('applyCropDrag', () {
    final circle = normalizedToImagePixels(
      initialNormalizedCrop(wide, shape: ImageCropShape.circle),
      wide,
    );

    test('move stays inside the image', () {
      final moved = applyCropDrag(
        crop: circle,
        bounds: wide,
        handle: ImageCropHandle.move,
        delta: const Offset(-1000, 40),
        aspectRatio: 1,
      );

      expect(moved.left, closeTo(0, 0.001));
      expect(moved.top, closeTo(0, 0.001));
      expect(moved.width, closeTo(100, 0.001));
      expect(moved.height, closeTo(100, 0.001));
      expect(moved.right, lessThanOrEqualTo(wide.width));
      expect(moved.bottom, lessThanOrEqualTo(wide.height));
    });

    test('resizing a circle keeps the ratio and the image bounds', () {
      final shrunk = applyCropDrag(
        crop: circle,
        bounds: wide,
        handle: ImageCropHandle.east,
        delta: const Offset(-40, 0),
        aspectRatio: 1,
        minWidth: 12,
        minHeight: 12,
      );

      expect(shrunk.width, closeTo(shrunk.height, 0.001));
      expect(shrunk.width, closeTo(60, 0.001));
      expect(shrunk.left, greaterThanOrEqualTo(0));
      expect(shrunk.top, greaterThanOrEqualTo(0));
      expect(shrunk.right, lessThanOrEqualTo(wide.width));
      expect(shrunk.bottom, lessThanOrEqualTo(wide.height));

      final blocked = applyCropDrag(
        crop: circle,
        bounds: wide,
        handle: ImageCropHandle.east,
        delta: const Offset(80, 0),
        aspectRatio: 1,
      );
      expect(blocked.width, closeTo(100, 0.001));
      expect(blocked.height, closeTo(100, 0.001));
      expect(blocked.right, lessThanOrEqualTo(wide.width));
    });

    test('a free rectangle changes ratio from an edge', () {
      const crop = Rect.fromLTWH(10, 10, 40, 30);
      final resized = applyCropDrag(
        crop: crop,
        bounds: square,
        handle: ImageCropHandle.east,
        delta: const Offset(20, 0),
      );

      expect(resized.left, closeTo(10, 0.001));
      expect(resized.top, closeTo(10, 0.001));
      expect(resized.width, closeTo(60, 0.001));
      expect(resized.height, closeTo(30, 0.001));
    });

    test('a locked rectangle keeps its ratio while resizing', () {
      const crop = Rect.fromLTWH(0, 25, 100, 50);
      final resized = applyCropDrag(
        crop: crop,
        bounds: square,
        handle: ImageCropHandle.southEast,
        delta: const Offset(-20, -20),
        aspectRatio: 2,
        minWidth: 10,
        minHeight: 10,
      );

      expect(resized.width / resized.height, closeTo(2, 0.02));
      expect(resized.left, greaterThanOrEqualTo(0));
      expect(resized.top, greaterThanOrEqualTo(0));
      expect(resized.right, lessThanOrEqualTo(square.width));
      expect(resized.bottom, lessThanOrEqualTo(square.height));
    });
  });

  test(
    'corner handles use a diagonal resize cursor and the inside uses move',
    () {
      expect(
        cropHandleCursor(ImageCropHandle.northWest),
        SystemMouseCursors.resizeUpLeftDownRight,
      );
      expect(
        cropHandleCursor(ImageCropHandle.southEast),
        SystemMouseCursors.resizeUpLeftDownRight,
      );
      expect(
        cropHandleCursor(ImageCropHandle.northEast),
        SystemMouseCursors.resizeUpRightDownLeft,
      );
      expect(
        cropHandleCursor(ImageCropHandle.southWest),
        SystemMouseCursors.resizeUpRightDownLeft,
      );
      expect(cropHandleCursor(ImageCropHandle.move), SystemMouseCursors.move);
      expect(cropHandleCursor(null), SystemMouseCursors.basic);
    },
  );

  test('every shape uses the same four corner handles', () {
    expect(cropHandles, [
      ImageCropHandle.northEast,
      ImageCropHandle.northWest,
      ImageCropHandle.southEast,
      ImageCropHandle.southWest,
    ]);
    expect(
      cropHandlePoint(const Rect.fromLTWH(0, 0, 100, 100), cropHandles.first),
      const Offset(100, 0),
    );
  });
}
