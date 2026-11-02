import 'dart:math' as math;
import 'dart:ui';

/// Outline drawn on top of an image to choose the region that will be kept.
enum ImageCropShape { circle, square, rectangle }

/// Which part of the guide the pointer is dragging.
enum ImageCropHandle {
  move,
  north,
  east,
  south,
  west,
  northEast,
  northWest,
  southEast,
  southWest,
}

/// Width / height locked by [shape], or null when a rectangle may change ratio.
///
/// Circle and square always return 1. A rectangle returns [aspectRatio] when
/// it is positive, and null when the caller wants a free ratio.
double? cropAspectRatio(ImageCropShape shape, double? aspectRatio) {
  switch (shape) {
    case ImageCropShape.circle:
    case ImageCropShape.square:
      return 1;
    case ImageCropShape.rectangle:
      if (aspectRatio == null || aspectRatio <= 0 || !aspectRatio.isFinite) {
        return null;
      }
      return aspectRatio;
  }
}

/// The four corner handles. The same corners are used for every shape, so a
/// circle, a square and a rectangle share one control layout.
const List<ImageCropHandle> cropHandles = [
  ImageCropHandle.northEast,
  ImageCropHandle.northWest,
  ImageCropHandle.southEast,
  ImageCropHandle.southWest,
];

/// Point of [handle] on [rect] (any coordinate space).
Offset cropHandlePoint(Rect rect, ImageCropHandle handle) {
  switch (handle) {
    case ImageCropHandle.move:
      return rect.center;
    case ImageCropHandle.north:
      return rect.topCenter;
    case ImageCropHandle.east:
      return rect.centerRight;
    case ImageCropHandle.south:
      return rect.bottomCenter;
    case ImageCropHandle.west:
      return rect.centerLeft;
    case ImageCropHandle.northEast:
      return rect.topRight;
    case ImageCropHandle.northWest:
      return rect.topLeft;
    case ImageCropHandle.southEast:
      return rect.bottomRight;
    case ImageCropHandle.southWest:
      return rect.bottomLeft;
  }
}

/// Largest centered crop inside an image of [imageSize].
///
/// The result is in normalized image space (0–1). A locked ratio uses the
/// biggest rectangle of that ratio. A free rectangle starts as the full image.
Rect initialNormalizedCrop(
  Size imageSize, {
  required ImageCropShape shape,
  double? aspectRatio,
}) {
  if (imageSize.width <= 0 || imageSize.height <= 0) {
    return const Rect.fromLTWH(0, 0, 1, 1);
  }
  final aspect = cropAspectRatio(shape, aspectRatio);
  if (aspect == null) {
    return const Rect.fromLTWH(0, 0, 1, 1);
  }

  final imageAspect = imageSize.width / imageSize.height;
  final double cropWidth;
  final double cropHeight;
  if (imageAspect > aspect) {
    cropHeight = imageSize.height;
    cropWidth = cropHeight * aspect;
  } else {
    cropWidth = imageSize.width;
    cropHeight = cropWidth / aspect;
  }
  final left = (imageSize.width - cropWidth) / 2;
  final top = (imageSize.height - cropHeight) / 2;
  return Rect.fromLTWH(
    left / imageSize.width,
    top / imageSize.height,
    cropWidth / imageSize.width,
    cropHeight / imageSize.height,
  );
}

/// Moves or resizes [crop] by [delta], keeping it inside [bounds].
///
/// [crop], [delta] and [bounds] share one coordinate space (image pixels).
/// [aspectRatio] null allows width and height to change independently.
/// Locked ratios stay locked. The result never leaves [bounds].
Rect applyCropDrag({
  required Rect crop,
  required Size bounds,
  required ImageCropHandle handle,
  required Offset delta,
  double? aspectRatio,
  double minWidth = 1,
  double minHeight = 1,
}) {
  if (bounds.width <= 0 || bounds.height <= 0) return crop;
  if (handle == ImageCropHandle.move) {
    return _shiftInside(crop.shift(delta), bounds);
  }

  final anchor = _anchor(crop, handle);
  final moving = _moving(crop, handle) + delta;
  final maxWidth = _maxSpan(
    anchor.dx,
    bounds.width,
    _growsEast(handle),
    _growsWest(handle),
    _centeredHorizontally(handle),
  );
  final maxHeight = _maxSpan(
    anchor.dy,
    bounds.height,
    _growsSouth(handle),
    _growsNorth(handle),
    _centeredVertically(handle),
  );
  if (maxWidth <= 0 || maxHeight <= 0) return crop;

  final rawWidth = (moving.dx - anchor.dx).abs();
  final rawHeight = (moving.dy - anchor.dy).abs();
  final size = _resolveSize(
    crop: crop,
    rawWidth: rawWidth,
    rawHeight: rawHeight,
    handle: handle,
    aspectRatio: aspectRatio,
    minWidth: math.min(minWidth, maxWidth),
    minHeight: math.min(minHeight, maxHeight),
    maxWidth: maxWidth,
    maxHeight: maxHeight,
  );

  return _shiftInside(_place(anchor, size.width, size.height, handle), bounds);
}

/// Shortest side the guide is allowed to shrink to, in image pixels.
double cropMinSide(Size imageSize, {double fraction = 0.12}) {
  if (imageSize.width <= 0 || imageSize.height <= 0) return 1;
  final shortest = math.min(imageSize.width, imageSize.height);
  final requested = math.max(1.0, shortest * fraction);
  return math.min(shortest, requested);
}

/// Where a [BoxFit.contain] image sits inside [viewport], inset by [padding].
Rect fittedImageRect(Size viewport, Size image, {double padding = 0}) {
  final bounds = padding <= 0
      ? Offset.zero & viewport
      : Rect.fromLTWH(
          padding,
          padding,
          math.max(0, viewport.width - padding * 2),
          math.max(0, viewport.height - padding * 2),
        );
  if (image.width <= 0 ||
      image.height <= 0 ||
      bounds.width <= 0 ||
      bounds.height <= 0) {
    return bounds;
  }
  final scale = math.min(
    bounds.width / image.width,
    bounds.height / image.height,
  );
  return Rect.fromCenter(
    center: bounds.center,
    width: image.width * scale,
    height: image.height * scale,
  );
}

Rect normalizedToSpace(Rect normalized, Rect space) {
  return Rect.fromLTWH(
    space.left + normalized.left * space.width,
    space.top + normalized.top * space.height,
    normalized.width * space.width,
    normalized.height * space.height,
  );
}

Rect imagePixelsToNormalized(Rect pixels, Size image) {
  if (image.width <= 0 || image.height <= 0) {
    return const Rect.fromLTWH(0, 0, 1, 1);
  }
  return Rect.fromLTWH(
    pixels.left / image.width,
    pixels.top / image.height,
    pixels.width / image.width,
    pixels.height / image.height,
  );
}

Rect normalizedToImagePixels(Rect normalized, Size image) {
  return Rect.fromLTWH(
    normalized.left * image.width,
    normalized.top * image.height,
    normalized.width * image.width,
    normalized.height * image.height,
  );
}

/// Integer source rect used when rasterizing a normalized crop.
Rect pixelCropRect(Rect normalized, int width, int height) {
  final safeWidth = math.max(1, width);
  final safeHeight = math.max(1, height);
  final left = (normalized.left * safeWidth).floor().clamp(0, safeWidth - 1);
  final top = (normalized.top * safeHeight).floor().clamp(0, safeHeight - 1);
  final right = (normalized.right * safeWidth).ceil().clamp(
    left + 1,
    safeWidth,
  );
  final bottom = (normalized.bottom * safeHeight).ceil().clamp(
    top + 1,
    safeHeight,
  );
  return Rect.fromLTRB(
    left.toDouble(),
    top.toDouble(),
    right.toDouble(),
    bottom.toDouble(),
  );
}

Offset _anchor(Rect rect, ImageCropHandle handle) {
  switch (handle) {
    case ImageCropHandle.southEast:
      return rect.topLeft;
    case ImageCropHandle.northWest:
      return rect.bottomRight;
    case ImageCropHandle.northEast:
      return rect.bottomLeft;
    case ImageCropHandle.southWest:
      return rect.topRight;
    case ImageCropHandle.east:
      return rect.centerLeft;
    case ImageCropHandle.west:
      return rect.centerRight;
    case ImageCropHandle.south:
      return rect.topCenter;
    case ImageCropHandle.north:
      return rect.bottomCenter;
    case ImageCropHandle.move:
      return rect.center;
  }
}

Offset _moving(Rect rect, ImageCropHandle handle) {
  switch (handle) {
    case ImageCropHandle.southEast:
      return rect.bottomRight;
    case ImageCropHandle.northWest:
      return rect.topLeft;
    case ImageCropHandle.northEast:
      return rect.topRight;
    case ImageCropHandle.southWest:
      return rect.bottomLeft;
    case ImageCropHandle.east:
      return rect.centerRight;
    case ImageCropHandle.west:
      return rect.centerLeft;
    case ImageCropHandle.south:
      return rect.bottomCenter;
    case ImageCropHandle.north:
      return rect.topCenter;
    case ImageCropHandle.move:
      return rect.center;
  }
}

bool _growsEast(ImageCropHandle handle) {
  return handle == ImageCropHandle.east ||
      handle == ImageCropHandle.northEast ||
      handle == ImageCropHandle.southEast;
}

bool _growsWest(ImageCropHandle handle) {
  return handle == ImageCropHandle.west ||
      handle == ImageCropHandle.northWest ||
      handle == ImageCropHandle.southWest;
}

bool _growsSouth(ImageCropHandle handle) {
  return handle == ImageCropHandle.south ||
      handle == ImageCropHandle.southEast ||
      handle == ImageCropHandle.southWest;
}

bool _growsNorth(ImageCropHandle handle) {
  return handle == ImageCropHandle.north ||
      handle == ImageCropHandle.northEast ||
      handle == ImageCropHandle.northWest;
}

bool _centeredHorizontally(ImageCropHandle handle) {
  return handle == ImageCropHandle.north || handle == ImageCropHandle.south;
}

bool _centeredVertically(ImageCropHandle handle) {
  return handle == ImageCropHandle.east || handle == ImageCropHandle.west;
}

double _maxSpan(
  double anchor,
  double limit,
  bool towardEnd,
  bool towardStart,
  bool centered,
) {
  if (centered) {
    return 2 * math.min(anchor, limit - anchor);
  }
  if (towardEnd) return math.max(0, limit - anchor);
  if (towardStart) return math.max(0, anchor);
  return limit;
}

Size _resolveSize({
  required Rect crop,
  required double rawWidth,
  required double rawHeight,
  required ImageCropHandle handle,
  required double? aspectRatio,
  required double minWidth,
  required double minHeight,
  required double maxWidth,
  required double maxHeight,
}) {
  final horizontal =
      handle == ImageCropHandle.east || handle == ImageCropHandle.west;
  final vertical =
      handle == ImageCropHandle.north || handle == ImageCropHandle.south;
  if (aspectRatio == null) {
    // Edge drags keep the other side; the moving point sits on the
    // center of that edge, so its cross-axis delta is not a new size.
    final width = horizontal || !vertical ? rawWidth : crop.width;
    final height = vertical || !horizontal ? rawHeight : crop.height;
    return Size(
      _fit(width, minWidth, maxWidth),
      _fit(height, minHeight, maxHeight),
    );
  }

  var width = rawWidth;
  var height = rawHeight;
  if (horizontal) {
    width = rawWidth;
    height = width / aspectRatio;
  } else if (vertical) {
    height = rawHeight;
    width = height * aspectRatio;
  } else if (rawHeight * aspectRatio > rawWidth) {
    width = rawHeight * aspectRatio;
    height = rawHeight;
  } else {
    height = rawWidth / aspectRatio;
    width = rawWidth;
  }

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  if (width < minWidth) {
    width = minWidth;
    height = width / aspectRatio;
  }
  if (height < minHeight) {
    height = minHeight;
    width = height * aspectRatio;
  }
  if (width > maxWidth || height > maxHeight) {
    width = math.min(width, maxWidth);
    height = width / aspectRatio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
  }
  return Size(width, height);
}

double _fit(double value, double min, double max) {
  return value.clamp(min, math.max(min, max)).toDouble();
}

Rect _place(
  Offset anchor,
  double width,
  double height,
  ImageCropHandle handle,
) {
  switch (handle) {
    case ImageCropHandle.southEast:
      return Rect.fromLTWH(anchor.dx, anchor.dy, width, height);
    case ImageCropHandle.northWest:
      return Rect.fromLTWH(
        anchor.dx - width,
        anchor.dy - height,
        width,
        height,
      );
    case ImageCropHandle.northEast:
      return Rect.fromLTWH(anchor.dx, anchor.dy - height, width, height);
    case ImageCropHandle.southWest:
      return Rect.fromLTWH(anchor.dx - width, anchor.dy, width, height);
    case ImageCropHandle.east:
      return Rect.fromLTWH(anchor.dx, anchor.dy - height / 2, width, height);
    case ImageCropHandle.west:
      return Rect.fromLTWH(
        anchor.dx - width,
        anchor.dy - height / 2,
        width,
        height,
      );
    case ImageCropHandle.south:
      return Rect.fromLTWH(anchor.dx - width / 2, anchor.dy, width, height);
    case ImageCropHandle.north:
      return Rect.fromLTWH(
        anchor.dx - width / 2,
        anchor.dy - height,
        width,
        height,
      );
    case ImageCropHandle.move:
      return Rect.fromLTWH(anchor.dx, anchor.dy, width, height);
  }
}

Rect _shiftInside(Rect rect, Size bounds) {
  var dx = 0.0;
  var dy = 0.0;
  if (rect.left < 0) {
    dx = -rect.left;
  } else if (rect.right > bounds.width) {
    dx = bounds.width - rect.right;
  }
  if (rect.top < 0) {
    dy = -rect.top;
  } else if (rect.bottom > bounds.height) {
    dy = bounds.height - rect.bottom;
  }
  final shifted = rect.shift(Offset(dx, dy));
  // A rect larger than the bounds cannot be shifted fully inside. Clip it.
  final left = shifted.left.clamp(0.0, bounds.width);
  final top = shifted.top.clamp(0.0, bounds.height);
  final right = shifted.right.clamp(left, bounds.width);
  final bottom = shifted.bottom.clamp(top, bounds.height);
  return Rect.fromLTRB(left, top, right, bottom);
}
