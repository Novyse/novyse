import 'package:flutter/material.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/storage/file/file_utils.dart';
import 'package:novyse/core/storage/file/playable_uri.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';
import 'package:novyse/ui/components/chat/message/message_placeholder_bar.dart';
import 'package:novyse/ui/components/chat/message/message_play_button.dart';
import 'package:novyse/ui/components/slider/app_progress_slider.dart';

/// Displays an audio file message with playback controls and a slider.
class MessageAudio extends StatelessWidget {
  const MessageAudio({
    super.key,
    required this.fileRef,
    required this.uuid,
    required this.name,
    this.size,
    this.duration,
    this.isPending = false,
    this.messageID,
    this.chatUUID,
    this.subID,
    this.senderUUID,
  });

  final String? fileRef;
  final String uuid;
  final String name;
  final int? size;
  final int? duration;
  final bool isPending;

  /// Chat context, stored in [ChatAudioService] for the global voice bar.
  final dynamic messageID;
  final String? chatUUID;
  final int? subID;
  final String? senderUUID;

  Future<void> _seek(double value) async {
    await ChatAudioService.instance.seek(Duration(milliseconds: value.toInt()));
  }

  Future<void> _togglePlayPause(String? uri) async {
    if (!isPlayableMediaUri(uri)) return;

    await ChatAudioService.instance.togglePlayPause(
      id: uuid,
      uri: uri!,
      initialDuration: duration != null ? Duration(seconds: duration!) : null,
      chatUUID: chatUUID,
      subID: subID,
      messageID: messageID,
      senderUUID: senderUUID,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return UriResolver(
      ref: fileRef,
      fileUUID: uuid,
      name: name,
      autoDownload: true,
      placeholder: _buildPlayerWidget(colorScheme, null, loading: true),
      builder: (context, resolvedUri) {
        final displayUri = resolveMediaUri(resolvedUri, fileRef);

        return ListenableBuilder(
          listenable: ChatAudioService.instance,
          builder: (context, _) => _buildPlayerWidget(colorScheme, displayUri),
        );
      },
    );
  }

  Widget _buildPlayerWidget(
    ColorScheme colorScheme,
    String? displayUri, {
    bool loading = false,
  }) {
    final audioService = ChatAudioService.instance;
    final isItemActive = !loading && audioService.isItemActive(uuid);
    final isPlaying = !loading && audioService.isItemPlaying(uuid);
    final currentPosition = loading
        ? Duration.zero
        : audioService.getItemPosition(uuid);

    final totalMs =
        !loading && isItemActive && audioService.duration > Duration.zero
        ? audioService.duration.inMilliseconds
        : (loading ? 0 : (duration ?? 0) * 1000);

    return Container(
      constraints: const BoxConstraints(minWidth: 200, maxWidth: 280),
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          MessagePlayButton(
            isPlaying: isPlaying,
            isPlayable: isPlayableMediaUri(displayUri),
            isPending: isPending,
            isLoading: loading,
            onTap: () => _togglePlayPause(displayUri),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                AppProgressSlider(
                  positionMs: currentPosition.inMilliseconds.toDouble(),
                  totalMs: totalMs.toDouble(),
                  onSeek: isItemActive ? _seek : null,
                  onSeekStart: isItemActive
                      ? ChatAudioService.instance.beginSeek
                      : null,
                  onSeekEnd: isItemActive
                      ? ChatAudioService.instance.endSeek
                      : null,
                ),
                if (loading)
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: MessagePlaceholderBar(),
                    ),
                  )
                else ...[
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
                          totalMs > 0 ? totalMs ~/ 1000 : duration,
                        ),
                        style: TextStyle(
                          fontSize: 11,
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  if (size != null && size! > 0)
                    Text(
                      formatFileSize(size),
                      style: TextStyle(
                        fontSize: 10,
                        color: colorScheme.onSurfaceVariant.withValues(
                          alpha: 0.7,
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
