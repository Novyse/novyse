import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/storage/file/file_utils.dart';
import 'package:novyse/core/storage/file/playable_uri.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Displays an audio file message with playback controls and progress slider.
class MessageAudio extends StatefulWidget {
  const MessageAudio({
    super.key,
    required this.fileRef,
    required this.uuid,
    required this.name,
    this.size,
    this.duration,
    this.isPending = false,
  });

  final String? fileRef;
  final String uuid;
  final String name;
  final int? size;
  final int? duration;
  final bool isPending;

  @override
  State<MessageAudio> createState() => _MessageAudioState();
}

class _MessageAudioState extends State<MessageAudio> {
  Future<void> _togglePlayPause(String? uri) async {
    if (!isPlayableMediaUri(uri)) return;

    await ChatAudioService.instance.togglePlayPause(
      id: widget.uuid,
      uri: uri!,
      initialDuration: widget.duration != null
          ? Duration(seconds: widget.duration!)
          : null,
    );
  }

  Future<void> _seek(double value) async {
    final position = Duration(milliseconds: value.toInt());
    await ChatAudioService.instance.seek(position);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // Use UriResolver to resolve local file refs or download via fileUUID
    return UriResolver(
      ref: widget.fileRef,
      fileUUID: widget.uuid,
      name: widget.name,
      mimeType: 'audio/mpeg',
      autoDownload: true,
      builder: (context, resolvedUri) {
        final displayUri = resolveMediaUri(resolvedUri, widget.fileRef);

        return ListenableBuilder(
          listenable: ChatAudioService.instance,
          builder: (context, _) =>
              _buildPlayerWidget(colorScheme, displayUri),
        );
      },
    );
  }

  Widget _buildPlayerWidget(ColorScheme colorScheme, String? displayUri) {
    final audioService = ChatAudioService.instance;
    final isItemActive = audioService.isItemActive(widget.uuid);
    final isPlaying = audioService.isItemPlaying(widget.uuid);
    final currentPosition = audioService.getItemPosition(widget.uuid);

    final totalMs = isItemActive && audioService.duration > Duration.zero
        ? audioService.duration.inMilliseconds
        : ((widget.duration ?? 0) * 1000);

    return Container(
      constraints: const BoxConstraints(minWidth: 200, maxWidth: 280),
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Play/Pause button
          _buildPlayButton(colorScheme, isPlaying, displayUri),
          const SizedBox(width: 10),
          // Slider and info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.name,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SliderTheme(
                  data: SliderThemeData(
                    trackHeight: 3,
                    thumbShape: const RoundSliderThumbShape(
                      enabledThumbRadius: 6,
                    ),
                    overlayShape: const RoundSliderOverlayShape(
                      overlayRadius: 14,
                    ),
                    activeTrackColor: colorScheme.primary,
                    inactiveTrackColor: colorScheme.surfaceContainerHighest,
                    thumbColor: colorScheme.primary,
                  ),
                  child: Slider(
                    value: currentPosition.inMilliseconds.toDouble().clamp(
                      0,
                      totalMs > 0 ? totalMs.toDouble() : 1.0,
                    ),
                    max: totalMs > 0 ? totalMs.toDouble() : 1.0,
                    onChanged: isItemActive ? _seek : null,
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      formatTime(currentPosition.inSeconds),
                      style: TextStyle(
                        fontSize: 11,
                        color: colorScheme.onSurfaceVariant,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    Text(
                      formatDuration(
                        totalMs > 0 ? totalMs ~/ 1000 : widget.duration,
                      ),
                      style: TextStyle(
                        fontSize: 11,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                if (widget.size != null && widget.size! > 0)
                  Text(
                    formatFileSize(widget.size),
                    style: TextStyle(
                      fontSize: 10,
                      color: colorScheme.onSurfaceVariant.withValues(
                        alpha: 0.7,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlayButton(
    ColorScheme colorScheme,
    bool isPlaying,
    String? displayUri,
  ) {
    final isAvailable =
        isPlayableMediaUri(displayUri) || widget.isPending;

    return GestureDetector(
      onTap: isAvailable && !widget.isPending
          ? () => _togglePlayPause(displayUri)
          : null,
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: isAvailable
              ? colorScheme.primary
              : colorScheme.surfaceContainerHighest,
          shape: BoxShape.circle,
        ),
        child: widget.isPending
            ? Padding(
                padding: const EdgeInsets.all(10),
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: colorScheme.onSurfaceVariant,
                ),
              )
            : AppHugeIcon(
                icon: isPlaying
                    ? HugeIcons.strokeRoundedPause
                    : HugeIcons.strokeRoundedPlay,
                color: isAvailable
                    ? colorScheme.onPrimary
                    : colorScheme.onSurfaceVariant,
                size: 24,
              ),
      ),
    );
  }
}
