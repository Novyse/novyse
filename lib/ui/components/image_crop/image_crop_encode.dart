import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:novyse/ui/components/image_crop/image_crop_geometry.dart';

/// Region of a source image chosen by [ImageCropGuide].
class ImageCropSelection {
  const ImageCropSelection({
    required this.normalized,
    required this.sourceWidth,
    required this.sourceHeight,
    required this.shape,
  });

  /// Crop inside the source image. Origin is the top-left, values are 0–1.
  final Rect normalized;
  final int sourceWidth;
  final int sourceHeight;
  final ImageCropShape shape;
}

/// Rasterizes [normalized] out of [source] as a PNG.
Future<Uint8List> cropImageBytes(Uint8List source, Rect normalized) async {
  final codec = await ui.instantiateImageCodec(source);
  final frame = await codec.getNextFrame();
  final image = frame.image;
  try {
    final src = pixelCropRect(normalized, image.width, image.height);
    final width = src.width.round();
    final height = src.height.round();
    final recorder = ui.PictureRecorder();
    Canvas(recorder).drawImageRect(
      image,
      src,
      Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
      Paint()..filterQuality = FilterQuality.high,
    );
    final cropped = await recorder.endRecording().toImage(width, height);
    try {
      final data = await cropped.toByteData(format: ui.ImageByteFormat.png);
      if (data == null) {
        throw StateError('Crop produced no image bytes.');
      }
      return data.buffer.asUint8List();
    } finally {
      cropped.dispose();
    }
  } finally {
    image.dispose();
    codec.dispose();
  }
}

/// Keeps the original base name and stores the crop as a PNG.
String croppedFileName(String name) {
  final dot = name.lastIndexOf('.');
  final base = (dot > 0 ? name.substring(0, dot) : name).trim();
  return '${base.isEmpty ? 'avatar' : base}.png';
}
