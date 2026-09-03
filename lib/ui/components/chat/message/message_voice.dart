import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/storage/file/file_utils.dart';
import 'package:novyse/core/storage/file/media_utils.dart';
import 'package:novyse/core/storage/file/playable_uri.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';

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
  });

  final String? fileRef;
  final String uuid;
  final int? size;
  final int? duration;
  final bool isPending;
  final List<double>? waveform;

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
                SizedBox(
                  height: 35,
                  child: _WaveformPainter(
                    waveformData: waveformData,
                    currentValue: currentPosition.inMilliseconds.toDouble(),
                    maxValue: totalMs.toDouble(),
                    activeColor: colorScheme.primary,
                    inactiveColor: colorScheme.onSurfaceVariant.withValues(
                      alpha: 0.4,
                    ),
                    isPlaying: isPlaying,
                  ),
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
            : Icon(
                isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                color: isAvailable
                    ? colorScheme.onPrimary
                    : colorScheme.onSurfaceVariant,
                size: 24,
              ),
      ),
    );
  }
}

class _WaveformPainter extends StatelessWidget {
  const _WaveformPainter({
    required this.waveformData,
    required this.currentValue,
    required this.maxValue,
    required this.activeColor,
    required this.inactiveColor,
    this.isPlaying = false,
  });

  final List<double> waveformData;
  final double currentValue;
  final double maxValue;
  final Color activeColor;
  final Color inactiveColor;
  final bool isPlaying;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth.isFinite && constraints.maxWidth > 0
            ? constraints.maxWidth
            : 160.0;
        return CustomPaint(
          size: Size(w, 35),
          painter: _WaveformCustomPainter(
            waveformData: waveformData,
            currentValue: currentValue,
            maxValue: maxValue,
            activeColor: activeColor,
            inactiveColor: inactiveColor,
          ),
        );
      },
    );
  }
}

class _WaveformCustomPainter extends CustomPainter {
  _WaveformCustomPainter({
    required this.waveformData,
    required this.currentValue,
    required this.maxValue,
    required this.activeColor,
    required this.inactiveColor,
  });

  final List<double> waveformData;
  final double currentValue;
  final double maxValue;
  final Color activeColor;
  final Color inactiveColor;

  @override
  void paint(Canvas canvas, Size size) {
    if (!size.width.isFinite ||
        !size.height.isFinite ||
        size.width <= 0 ||
        size.height <= 0 ||
        waveformData.isEmpty) {
      return;
    }

    final barWidth = size.width / waveformData.length;
    final gap = barWidth * 0.2;
    final actualBarWidth = barWidth - gap;
    final centerY = size.height / 2;
    final maxBarHeight = size.height * 0.85;

    final progress = maxValue > 0
        ? (currentValue / maxValue).clamp(0.0, 1.0)
        : 0.0;
    final activeBars = (progress * waveformData.length).floor();

    final paint = Paint()..strokeCap = StrokeCap.round;

    for (var i = 0; i < waveformData.length; i++) {
      final x = i * barWidth + gap / 2;
      final amplitude = waveformData[i].clamp(0.05, 1.0);
      final barHeight = amplitude * maxBarHeight;

      paint.color = i < activeBars ? activeColor : inactiveColor;
      paint.strokeWidth = actualBarWidth.clamp(1.5, 4.0);

      canvas.drawLine(
        Offset(x + actualBarWidth / 2, centerY - barHeight / 2),
        Offset(x + actualBarWidth / 2, centerY + barHeight / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _WaveformCustomPainter oldDelegate) {
    return oldDelegate.currentValue != currentValue ||
        oldDelegate.maxValue != maxValue ||
        oldDelegate.waveformData != waveformData;
  }
}
