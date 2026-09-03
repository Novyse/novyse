import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';
import 'package:photo_view/photo_view.dart';

/// Displays an image message with tap-to-zoom and loading states.
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

  double get _computedWidth {
    if (widget.width != null && widget.height != null && widget.height! > 0) {
      final wScale = _maxWidth / widget.width!;
      final hScale = _maxHeight / widget.height!;
      final scale = [1.0, wScale, hScale].reduce((a, b) => a < b ? a : b);
      return widget.width! * scale;
    }
    return 220;
  }

  double? get _computedAspectRatio {
    if (widget.aspectRatio != null) return widget.aspectRatio;
    if (widget.width != null && widget.height != null && widget.height! > 0) {
      return widget.width! / widget.height!;
    }
    return null;
  }

  Widget _buildImageWidget(String displayUri, ThemeData theme) {
    if (kIsWeb ||
        displayUri.startsWith('blob:') ||
        displayUri.startsWith('data:') ||
        displayUri.startsWith('http://') ||
        displayUri.startsWith('https://')) {
      return Image.network(
        displayUri,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => _buildError(theme),
      );
    }

    // Local file on native
    final cleanPath = displayUri.startsWith('file://')
        ? displayUri.replaceFirst('file://', '')
        : displayUri;
    return Image.file(
      io.File(cleanPath),
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => _buildError(theme),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Use UriResolver to resolve local file refs or download via fileUUID
    return UriResolver(
      ref: widget.fileRef,
      fileUUID: widget.uuid,
      mimeType: 'image/jpeg',
      autoDownload: true,
      placeholder: _buildPlaceholder(theme),
      builder: (context, resolvedUri) {
        final displayUri = resolvedUri ?? widget.fileRef;

        if (displayUri == null || displayUri.isEmpty) {
          return _buildPlaceholder(theme);
        }

        final imageWidget = _buildImageWidget(displayUri, theme);

        final container = ClipRRect(
          borderRadius: BorderRadius.circular(widget.isSingle ? 12 : 4),
          child: widget.isSingle
              ? SizedBox(
                  width: _computedWidth,
                  height: _computedAspectRatio != null
                      ? _computedWidth / _computedAspectRatio!
                      : 200,
                  child: imageWidget,
                )
              : AspectRatio(aspectRatio: 1.0, child: imageWidget),
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

  Widget _buildPlaceholder(ThemeData theme) {
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
      return AspectRatio(aspectRatio: 1.0, child: indicator);
    }

    return SizedBox(width: _computedWidth, height: 180, child: indicator);
  }

  Widget _buildError(ThemeData theme) {
    final errorWidget = Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(widget.isSingle ? 12 : 4),
      ),
      child: Icon(
        Icons.broken_image_rounded,
        size: 36,
        color: theme.colorScheme.onErrorContainer,
      ),
    );

    if (!widget.isSingle) {
      return AspectRatio(aspectRatio: 1.0, child: errorWidget);
    }

    return SizedBox(width: _computedWidth, height: 180, child: errorWidget);
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
