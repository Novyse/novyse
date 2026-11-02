import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:novyse/ui/components/image_crop/image_crop_encode.dart';
import 'package:novyse/ui/components/image_crop/image_crop_geometry.dart';

/// Shows a whole image with a movable, resizable guide on top.
///
/// The guide never leaves the image. [ImageCropShape.circle] and
/// [ImageCropShape.square] keep a 1:1 ratio. A [ImageCropShape.rectangle]
/// keeps [aspectRatio] when it is set, and can change ratio when it is null.
/// Cursor for a guide hit target: diagonal resize on the corners, move inside.
MouseCursor cropHandleCursor(ImageCropHandle? handle) {
  switch (handle) {
    case ImageCropHandle.northWest:
    case ImageCropHandle.southEast:
      return SystemMouseCursors.resizeUpLeftDownRight;
    case ImageCropHandle.northEast:
    case ImageCropHandle.southWest:
      return SystemMouseCursors.resizeUpRightDownLeft;
    case ImageCropHandle.north:
    case ImageCropHandle.south:
      return SystemMouseCursors.resizeUpDown;
    case ImageCropHandle.east:
    case ImageCropHandle.west:
      return SystemMouseCursors.resizeLeftRight;
    case ImageCropHandle.move:
      return SystemMouseCursors.move;
    case null:
      return SystemMouseCursors.basic;
  }
}

class ImageCropGuide extends StatefulWidget {
  const ImageCropGuide({
    super.key,
    required this.bytes,
    this.shape = ImageCropShape.rectangle,
    this.aspectRatio,
    this.onChanged,
    this.onError,
    this.enabled = true,
    this.height = 260,
    this.minFraction = 0.12,
  });

  final Uint8List bytes;
  final ImageCropShape shape;

  /// Width divided by height. Ignored for circle and square.
  final double? aspectRatio;
  final ValueChanged<ImageCropSelection>? onChanged;
  final VoidCallback? onError;
  final bool enabled;
  final double height;

  /// Smallest guide side, as a fraction of the image's shorter side.
  final double minFraction;

  @override
  State<ImageCropGuide> createState() => _ImageCropGuideState();
}

class _ImageCropGuideState extends State<ImageCropGuide> {
  static const double _padding = 14;
  static const double _hitSlop = 10;

  ui.Image? _image;
  Rect? _crop;
  int _loadGeneration = 0;
  ImageCropHandle? _drag;
  ImageCropHandle? _hover;
  Rect? _originPixels;
  Offset? _originGlobal;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(ImageCropGuide oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.bytes, widget.bytes)) {
      _load();
      return;
    }
    if (oldWidget.shape != widget.shape ||
        oldWidget.aspectRatio != widget.aspectRatio) {
      _resetCrop();
    }
  }

  @override
  void dispose() {
    _image?.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final generation = ++_loadGeneration;
    final bytes = widget.bytes;
    try {
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      codec.dispose();
      if (!mounted || generation != _loadGeneration) {
        frame.image.dispose();
        return;
      }
      _image?.dispose();
      _image = frame.image;
      _resetCrop();
    } catch (_) {
      if (!mounted || generation != _loadGeneration) return;
      _image?.dispose();
      setState(() {
        _image = null;
        _crop = null;
      });
      widget.onError?.call();
    }
  }

  void _resetCrop() {
    final image = _image;
    if (image == null) return;
    final crop = initialNormalizedCrop(
      Size(image.width.toDouble(), image.height.toDouble()),
      shape: widget.shape,
      aspectRatio: widget.aspectRatio,
    );
    setState(() => _crop = crop);
    _notify(crop);
  }

  void _notify(Rect normalized) {
    final image = _image;
    if (image == null) return;
    widget.onChanged?.call(
      ImageCropSelection(
        normalized: normalized,
        sourceWidth: image.width,
        sourceHeight: image.height,
        shape: widget.shape,
      ),
    );
  }

  Size get _imageSize {
    final image = _image!;
    return Size(image.width.toDouble(), image.height.toDouble());
  }

  bool _shouldClaim(PointerDownEvent event) {
    if (!widget.enabled || _image == null || _crop == null) return false;
    final box = context.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return false;
    final local = box.globalToLocal(event.position);
    final handle = _hitTest(local, box.size);
    if (handle == null) return false;
    _drag = handle;
    _originPixels = normalizedToImagePixels(_crop!, _imageSize);
    _originGlobal = event.position;
    return true;
  }

  void _onMove(PointerMoveEvent event) {
    final drag = _drag;
    final origin = _originPixels;
    final start = _originGlobal;
    final image = _image;
    final box = context.findRenderObject();
    if (drag == null ||
        origin == null ||
        start == null ||
        image == null ||
        box is! RenderBox ||
        !box.hasSize) {
      return;
    }
    final imageRect = fittedImageRect(box.size, _imageSize, padding: _padding);
    if (imageRect.width <= 0) return;
    final scale = imageRect.width / image.width;
    final delta = (event.position - start) / scale;
    final next = applyCropDrag(
      crop: origin,
      bounds: _imageSize,
      handle: drag,
      delta: delta,
      aspectRatio: cropAspectRatio(widget.shape, widget.aspectRatio),
      minWidth: cropMinSide(_imageSize, fraction: widget.minFraction),
      minHeight: cropMinSide(_imageSize, fraction: widget.minFraction),
    );
    final normalized = imagePixelsToNormalized(next, _imageSize);
    setState(() => _crop = normalized);
    _notify(normalized);
  }

  void _onEnd() {
    _drag = null;
    _originPixels = null;
    _originGlobal = null;
    if (mounted) setState(() {});
  }

  void _onHover(PointerHoverEvent event) {
    final box = context.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return;
    final next = _hitTest(box.globalToLocal(event.position), box.size);
    if (next == _hover) return;
    setState(() => _hover = next);
  }

  void _onExit(PointerExitEvent event) {
    if (_hover == null) return;
    setState(() => _hover = null);
  }

  MouseCursor _cursorFor(ui.Image? image) {
    if (!widget.enabled || image == null) return SystemMouseCursors.basic;
    return cropHandleCursor(_drag ?? _hover);
  }

  ImageCropHandle? _hitTest(Offset local, Size viewport) {
    final crop = _crop;
    final image = _image;
    if (crop == null || image == null) return null;
    final imageRect = fittedImageRect(viewport, _imageSize, padding: _padding);
    final display = normalizedToSpace(crop, imageRect);
    for (final handle in cropHandles) {
      final point = cropHandlePoint(display, handle);
      if ((local - point).distance <= _hitSlop) return handle;
    }
    if (widget.shape == ImageCropShape.circle) {
      final radius = math.min(display.width, display.height) / 2;
      if ((local - display.center).distance <= radius) {
        return ImageCropHandle.move;
      }
      return null;
    }
    if (display.contains(local)) return ImageCropHandle.move;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final image = _image;
    final crop = _crop;
    final theme = Theme.of(context);
    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: MouseRegion(
        cursor: _cursorFor(image),
        onHover: widget.enabled ? _onHover : null,
        onExit: widget.enabled ? _onExit : null,
        child: RawGestureDetector(
          behavior: HitTestBehavior.opaque,
          gestures: {
            _CropPanRecognizer:
                GestureRecognizerFactoryWithHandlers<_CropPanRecognizer>(
                  _CropPanRecognizer.new,
                  (recognizer) {
                    recognizer.shouldClaim = _shouldClaim;
                    recognizer.onMove = _onMove;
                    recognizer.onEnd = _onEnd;
                  },
                ),
          },
          child: CustomPaint(
            painter: image == null || crop == null
                ? null
                : _CropGuidePainter(
                    image: image,
                    normalizedCrop: crop,
                    shape: widget.shape,
                    padding: _padding,
                    guide: theme.colorScheme.primary,
                    scrim: theme.colorScheme.scrim.withValues(alpha: 0.55),
                    handleFill: theme.colorScheme.surface,
                  ),
            child: image == null
                ? const Center(
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : const SizedBox.expand(),
          ),
        ),
      ),
    );
  }
}

class _CropGuidePainter extends CustomPainter {
  const _CropGuidePainter({
    required this.image,
    required this.normalizedCrop,
    required this.shape,
    required this.padding,
    required this.guide,
    required this.scrim,
    required this.handleFill,
  });

  final ui.Image image;
  final Rect normalizedCrop;
  final ImageCropShape shape;
  final double padding;
  final Color guide;
  final Color scrim;
  final Color handleFill;

  @override
  void paint(Canvas canvas, Size size) {
    final imageSize = Size(image.width.toDouble(), image.height.toDouble());
    final imageRect = fittedImageRect(size, imageSize, padding: padding);
    canvas.drawImageRect(
      image,
      Rect.fromLTWH(0, 0, imageSize.width, imageSize.height),
      imageRect,
      Paint()..filterQuality = FilterQuality.medium,
    );

    final crop = normalizedToSpace(normalizedCrop, imageRect);
    final overlay = Path()..addRect(imageRect);
    if (shape == ImageCropShape.circle) {
      overlay.addOval(crop);
    } else {
      overlay.addRect(crop);
    }
    overlay.fillType = PathFillType.evenOdd;
    canvas.drawPath(overlay, Paint()..color = scrim);

    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = guide;
    if (shape == ImageCropShape.circle) {
      canvas.drawOval(crop.deflate(1), stroke);
    } else {
      canvas.drawRect(crop.deflate(1), stroke);
      _paintThirds(canvas, crop);
    }

    final handlePaint = Paint()..color = handleFill;
    final handleStroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = guide;
    for (final handle in cropHandles) {
      final point = cropHandlePoint(crop, handle);
      canvas.drawCircle(point, 6, handlePaint);
      canvas.drawCircle(point, 6, handleStroke);
    }
  }

  void _paintThirds(Canvas canvas, Rect crop) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = guide.withValues(alpha: 0.45);
    canvas.save();
    canvas.clipRect(crop);
    for (final fraction in const [1 / 3, 2 / 3]) {
      final dx = crop.left + crop.width * fraction;
      final dy = crop.top + crop.height * fraction;
      canvas.drawLine(Offset(dx, crop.top), Offset(dx, crop.bottom), paint);
      canvas.drawLine(Offset(crop.left, dy), Offset(crop.right, dy), paint);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_CropGuidePainter oldDelegate) {
    return oldDelegate.image != image ||
        oldDelegate.normalizedCrop != normalizedCrop ||
        oldDelegate.shape != shape ||
        oldDelegate.guide != guide ||
        oldDelegate.scrim != scrim ||
        oldDelegate.handleFill != handleFill;
  }
}

class _CropPanRecognizer extends OneSequenceGestureRecognizer {
  _CropPanRecognizer();

  bool Function(PointerDownEvent event)? shouldClaim;
  void Function(PointerMoveEvent event)? onMove;
  VoidCallback? onEnd;

  @override
  String get debugDescription => 'cropPan';

  @override
  void addAllowedPointer(PointerDownEvent event) {
    super.addAllowedPointer(event);
    if (shouldClaim?.call(event) ?? false) {
      resolve(GestureDisposition.accepted);
    } else {
      resolve(GestureDisposition.rejected);
    }
  }

  @override
  void handleEvent(PointerEvent event) {
    if (event is PointerMoveEvent) {
      onMove?.call(event);
    } else if (event is PointerUpEvent || event is PointerCancelEvent) {
      onEnd?.call();
      stopTrackingPointer(event.pointer);
    }
  }

  @override
  void didStopTrackingLastPointer(int pointer) {}

  @override
  void acceptGesture(int pointer) {}

  @override
  void rejectGesture(int pointer) {
    stopTrackingPointer(pointer);
  }
}
