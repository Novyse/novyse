import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:photo_view/photo_view.dart';
import 'package:novyse/core/chat/message_format.dart';

/// Displays a GIF message with tap-to-zoom viewer.
class MessageGif extends StatefulWidget {
  const MessageGif({super.key, required this.url});

  final String url;

  @override
  State<MessageGif> createState() => _MessageGifState();
}

class _MessageGifState extends State<MessageGif> {
  final double _aspectRatio = 1.2;

  static const double _maxWidth = 240.0;
  static const double _maxHeight = 320.0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mediaUrl = getGifMediaUrl(widget.url);

    if (mediaUrl == null) return const SizedBox.shrink();

    final clampedRatio = _aspectRatio.clamp(0.5, 2.5);
    var width = _maxWidth;
    var height = width / clampedRatio;
    if (height > _maxHeight) {
      height = _maxHeight;
      width = height * clampedRatio;
    }

    return GestureDetector(
      onTap: () => _openViewer(context, mediaUrl),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          width: width,
          height: height,
          child: CachedNetworkImage(
            imageUrl: mediaUrl,
            fit: BoxFit.cover,
            placeholder: (context, url) => Container(
              width: width,
              height: height,
              color: theme.colorScheme.surfaceContainerHighest,
              child: Center(
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
            errorWidget: (context, url, error) => Container(
              width: width,
              height: height,
              color: theme.colorScheme.errorContainer,
              child: Icon(
                Icons.broken_image_rounded,
                color: theme.colorScheme.onErrorContainer,
              ),
            ),
            imageBuilder: (context, imageProvider) {
              return Image(
                image: imageProvider,
                fit: BoxFit.cover,
                width: width,
                height: height,
              );
            },
          ),
        ),
      ),
    );
  }

  void _openViewer(BuildContext context, String url) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            iconTheme: const IconThemeData(color: Colors.white),
            elevation: 0,
          ),
          body: PhotoView(
            imageProvider: CachedNetworkImageProvider(url),
            minScale: PhotoViewComputedScale.contained,
            maxScale: PhotoViewComputedScale.covered * 3,
            loadingBuilder: (context, event) => Center(
              child: CircularProgressIndicator(
                value: event == null
                    ? null
                    : event.cumulativeBytesLoaded /
                          (event.expectedTotalBytes ?? 1),
                color: Colors.white,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
