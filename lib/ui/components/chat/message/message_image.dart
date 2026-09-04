import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:photo_view/photo_view.dart';

class MessageImage extends StatefulWidget {
  const MessageImage({
    super.key,
    required this.fileRef,
    required this.uuid,
    this.size,
    this.width,
    this.height,
    this.isSingle = true,
    this.isPending = false,
    this.aspectRatio,
  });

  final String? fileRef;
  final String uuid;
  final int? size;
  final int? width;
  final int? height;
  final bool isSingle;
  final bool isPending;
  final double? aspectRatio;

  @override
  State<MessageImage> createState() => _MessageImageState();
}

class _MessageImageState extends State<MessageImage> {
  static const double _maxWidth = 240.0;
  static const double _maxHeight = 320.0;
  static const double _fallbackAspect = 4 / 3;
  static const double _minBoxHeight = 50.0;
  static const double _maxBoxHeight = 1000.0;

  double? _resolvedAspect;
  String? _listenedKey;
  ImageStream? _stream;
  ImageStreamListener? _listener;

  @override
  void dispose() {
    _detachListener();
    super.dispose();
  }

  void _detachListener() {
    if (_stream != null && _listener != null) {
      _stream!.removeListener(_listener!);
    }
    _stream = null;
    _listener = null;
  }

  void _ensureResolved(String key, ImageProvider provider) {
    if (_listenedKey == key) return;
    _detachListener();
    _listenedKey = key;
    _stream = provider.resolve(const ImageConfiguration());
    _listener = ImageStreamListener(
      (info, _) {
        if (!mounted) return;
        if (info.image.height > 0) {
          setState(() {
            _resolvedAspect = info.image.width / info.image.height;
          });
        }
      },
    );
    _stream!.addListener(_listener!);
  }

  double _capWidth(BuildContext context) {
    return (MediaQuery.sizeOf(context).width * 0.6 - 32).clamp(120.0, _maxWidth);
  }

  double _boxWidth(BuildContext context) {
    if (widget.width != null && widget.height != null && widget.height! > 0) {
      final cap = _capWidth(context);
      final wScale = cap / widget.width!;
      final hScale = _maxHeight / widget.height!;
      final scale = [1.0, wScale, hScale].reduce((a, b) => a < b ? a : b);
      return widget.width! * scale;
    }
    return _capWidth(context);
  }

  double? get _metadataAspect {
    if (widget.aspectRatio != null) return widget.aspectRatio;
    if (widget.width != null && widget.height != null && widget.height! > 0) {
      return widget.width! / widget.height!;
    }
    return null;
  }

  double get _effectiveAspect => _metadataAspect ?? _resolvedAspect ?? _fallbackAspect;

  (double, double) _boxSize(BuildContext context) {
    final width = _boxWidth(context);
    final height = width / _effectiveAspect;
    if (height > _maxBoxHeight) {
      return (_maxBoxHeight * _effectiveAspect, _maxBoxHeight);
    }
    if (height < _minBoxHeight) {
      var clampedWidth = _minBoxHeight * _effectiveAspect;
      final cap = _capWidth(context);
      if (clampedWidth > cap) clampedWidth = cap;
      return (clampedWidth, _minBoxHeight);
    }
    return (width, height);
  }

  double _gridAspect() => _effectiveAspect.clamp(0.5, 2.0);

  bool _isRemote(String uri) {
    return kIsWeb ||
        uri.startsWith('blob:') ||
        uri.startsWith('data:') ||
        uri.startsWith('http://') ||
        uri.startsWith('https://');
  }

  ImageProvider _providerFor(String uri) {
    if (_isRemote(uri)) return NetworkImage(uri);
    final cleanPath = uri.startsWith('file://')
        ? uri.replaceFirst('file://', '')
        : uri;
    return FileImage(io.File(cleanPath));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return UriResolver(
      ref: widget.fileRef,
      fileUUID: widget.uuid,
      mimeType: 'image/jpeg',
      autoDownload: true,
      placeholder: _buildPlaceholder(theme, context),
      builder: (context, resolvedUri) {
        final displayUri = resolvedUri ?? widget.fileRef;

        if (displayUri == null || displayUri.isEmpty) {
          return _buildPlaceholder(theme, context);
        }

        final provider = _providerFor(displayUri);
        _ensureResolved(displayUri, provider);

        final imageWidget = Image(
          image: provider,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) =>
              _buildError(theme, context),
        );

        final container = ClipRRect(
          borderRadius: BorderRadius.circular(widget.isSingle ? 12 : 4),
          child: widget.isSingle
              ? Builder(
                  builder: (context) {
                    final (width, height) = _boxSize(context);
                    return SizedBox(
                      width: width,
                      height: height,
                      child: imageWidget,
                    );
                  },
                )
              : AspectRatio(aspectRatio: _gridAspect(), child: imageWidget),
        );

        return GestureDetector(
          onTap: () => _openViewer(context, displayUri),
          child: widget.isPending
              ? Opacity(opacity: 0.6, child: container)
              : container,
        );
      },
    );
  }

  Widget _buildPlaceholder(ThemeData theme, BuildContext context) {
    final indicator = Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(widget.isSingle ? 12 : 4),
      ),
      child: Center(
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: theme.colorScheme.primary,
        ),
      ),
    );

    if (!widget.isSingle) {
      return AspectRatio(aspectRatio: _gridAspect(), child: indicator);
    }

    final (width, height) = _boxSize(context);
    return SizedBox(width: width, height: height, child: indicator);
  }

  Widget _buildError(ThemeData theme, BuildContext context) {
    final errorWidget = Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(widget.isSingle ? 12 : 4),
      ),
      child: AppHugeIcon(
        icon: HugeIcons.strokeRoundedImageNotFound01,
        size: 36,
        color: theme.colorScheme.onErrorContainer,
      ),
    );

    if (!widget.isSingle) {
      return AspectRatio(aspectRatio: _gridAspect(), child: errorWidget);
    }

    final (width, height) = _boxSize(context);
    return SizedBox(width: width, height: height, child: errorWidget);
  }

  void _openViewer(BuildContext context, String imageUrl) {
    if (imageUrl.isEmpty) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _ImageViewerPage(
          imageUrl: imageUrl,
          heroTag: 'image-${widget.uuid}',
        ),
      ),
    );
  }
}

class _ImageViewerPage extends StatelessWidget {
  const _ImageViewerPage({required this.imageUrl, required this.heroTag});

  final String imageUrl;
  final String heroTag;

  ImageProvider _getImageProvider() {
    if (kIsWeb ||
        imageUrl.startsWith('blob:') ||
        imageUrl.startsWith('data:') ||
        imageUrl.startsWith('http://') ||
        imageUrl.startsWith('https://')) {
      return NetworkImage(imageUrl);
    }
    final cleanPath = imageUrl.startsWith('file://')
        ? imageUrl.replaceFirst('file://', '')
        : imageUrl;
    return FileImage(io.File(cleanPath));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: PhotoView(
        imageProvider: _getImageProvider(),
        minScale: PhotoViewComputedScale.contained,
        maxScale: PhotoViewComputedScale.covered * 3,
        heroAttributes: PhotoViewHeroAttributes(tag: heroTag),
        loadingBuilder: (context, event) => Center(
          child: CircularProgressIndicator(
            value: event == null
                ? null
                : event.cumulativeBytesLoaded / (event.expectedTotalBytes ?? 1),
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}
