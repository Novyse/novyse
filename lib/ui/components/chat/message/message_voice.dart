import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/storage/file/file_utils.dart';
import 'package:novyse/core/storage/file/media_utils.dart';
import 'package:novyse/core/storage/file/playable_uri.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/slider/app_progress_slider.dart';

/// Displays a voice message with waveform visualization and playback controls.
class MessageVoice extends StatefulWidget {
  const MessageVoice({
    super.key,
    required this.fileRef,
    required this.uuid,
    this.size,
    this.duration,
    this.isPending = false,
    this.waveform,
    this.messageID,
    this.chatUUID,
    this.subID,
    this.senderUUID,
  });

  final String? fileRef;
  final String uuid;
  final int? size;
  final int? duration;
  final bool isPending;
  final List<double>? waveform;

  /// Chat context, stored in [ChatAudioService] for the global voice bar.
  final dynamic messageID;
  final String? chatUUID;
  final int? subID;
  final String? senderUUID;

  @override
  State<MessageVoice> createState() => _MessageVoiceState();
}

class _MessageVoiceState extends State<MessageVoice> {
  Future<void> _togglePlayPause(String? uri) async {
    if (!isPlayableMediaUri(uri)) return;

    await ChatAudioService.instance.togglePlayPause(
      id: widget.uuid,
      uri: uri!,
      initialDuration: widget.duration != null
          ? Duration(seconds: widget.duration!)
          : null,
      chatUUID: widget.chatUUID,
      subID: widget.subID,
      messageID: widget.messageID,
      senderUUID: widget.senderUUID,
      isVoice: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final mimeType =
        (widget.fileRef != null && widget.fileRef!.contains('.webm')) ||
            widget.uuid.contains('.webm')
        ? 'audio/webm'
        : (kIsWeb ? 'audio/webm' : 'audio/aac');

    // Use UriResolver to resolve local file refs or download via fileUUID
    return UriResolver(
      ref: widget.fileRef,
      fileUUID: widget.uuid,
      mimeType: mimeType,
      autoDownload: true,
      builder: (context, resolvedUri) {
        final displayUri = resolveMediaUri(resolvedUri, widget.fileRef);

        return ListenableBuilder(
          listenable: ChatAudioService.instance,
          builder: (context, _) => _buildPlayerWidget(colorScheme, displayUri),
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

    final waveformData = widget.waveform ?? defaultWaveform;

    return Container(
      constraints: const BoxConstraints(minWidth: 200, maxWidth: 280),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Play/Pause button
          _buildPlayButton(colorScheme, isPlaying, displayUri),
          const SizedBox(width: 10),
          // Waveform and duration
          Expanded(
            child: Column(
              children: [
                AppProgressSlider(
                  waveform: waveformData,
                  positionMs: currentPosition.inMilliseconds.toDouble(),
                  totalMs: totalMs.toDouble(),
                  onSeek: isItemActive
                      ? (v) => ChatAudioService.instance.seek(
                          Duration(milliseconds: v.toInt()),
                        )
                      : null,
                ),
                const SizedBox(height: 4),
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
    final isPlayable = isPlayableMediaUri(displayUri);
    final isAvailable = isPlayable || widget.isPending;

    return GestureDetector(
      onTap: isPlayable && !widget.isPending
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
