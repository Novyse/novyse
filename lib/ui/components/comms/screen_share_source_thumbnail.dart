import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

/// Static thumbnail of a single desktop source (screen or window):
/// preview image + name, highlighted when selected.
class ScreenShareSourceThumbnail extends StatelessWidget {
  const ScreenShareSourceThumbnail({
    super.key,
    required this.source,
    this.expand = false,
    this.size = 56.0,
    this.isSelected = false,
  });

  final DesktopCapturerSource source;
  final bool expand;
  final double size;

  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final hasThumbnail =
        source.thumbnail != null && source.thumbnail!.isNotEmpty;

    final placeholder = Container(
      color: Colors.black26,
      child: const Center(
        child: Icon(
          Icons.screen_share_rounded,
          color: Colors.white54,
          size: 32,
        ),
      ),
    );

    final thumbnail = hasThumbnail
        ? Image.memory(
            source.thumbnail!,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => placeholder,
          )
        : placeholder;

    final thumbnailBox = expand
        ? Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: thumbnail,
            ),
          )
        : SizedBox(
            width: size,
            height: size * 9 / 16,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: thumbnail,
            ),
          );

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        thumbnailBox,
        const SizedBox(height: 6),
        Text(
          source.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: expand ? TextAlign.center : TextAlign.left,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? colorScheme.primary : colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}
