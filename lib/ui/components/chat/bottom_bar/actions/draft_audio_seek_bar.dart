import 'package:flutter/material.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/storage/file/draft_file_preview.dart';

/// Thin seekable progress bar pinned to the bottom of audio/voice draft chips.
///
/// Shows playback progress and supports tap + horizontal drag to seek. When
/// the track is not the active one yet, interacting starts playback instead.
class DraftAudioSeekBar extends StatelessWidget {
  const DraftAudioSeekBar({
    super.key,
    required this.chatUUID,
    required this.index,
    required this.file,
    required this.durationSeconds,
  });

  final String chatUUID;
  final int index;
  final dynamic file;
  final int? durationSeconds;

  Future<void> _jump(double fraction, int totalMs, bool isActive) async {
    final clamped = fraction.clamp(0.0, 1.0);
    if (isActive && totalMs > 0) {
      await ChatAudioService.instance.seek(
        Duration(milliseconds: (clamped * totalMs).round()),
      );
    } else {
      await toggleDraftAudioPlayback(
        chatUUID: chatUUID,
        index: index,
        file: file,
        durationSeconds: durationSeconds,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final draftId = draftFileId(chatUUID, index);

    return ListenableBuilder(
      listenable: ChatAudioService.instance,
      builder: (context, _) {
        final service = ChatAudioService.instance;
        final isActive = service.isItemActive(draftId);
        final totalMs = isActive && service.duration > Duration.zero
            ? service.duration.inMilliseconds
            : ((durationSeconds ?? 0) * 1000);
        final progress = totalMs > 0
            ? (service.getItemPosition(draftId).inMilliseconds / totalMs)
                  .clamp(0.0, 1.0)
            : 0.0;

        return Builder(
          builder: (barContext) {
            // Measured from this bar's own RenderBox: no LayoutBuilder is
            // needed, keeping the widget compatible with unbounded parents.
            void jumpTo(double dx) {
              final renderObject = barContext.findRenderObject();
              final width = renderObject is RenderBox && renderObject.hasSize
                  ? renderObject.size.width
                  : 0.0;
              if (width <= 0) return;
              _jump(dx / width, totalMs, isActive);
            }

            return GestureDetector(
              key: Key('draft_seek_$index'),
              behavior: HitTestBehavior.opaque,
              onTapDown: (details) => jumpTo(details.localPosition.dx),
              onHorizontalDragUpdate: (details) =>
                  jumpTo(details.localPosition.dx),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: SizedBox(
                    height: 4,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Container(
                          color: colorScheme.surfaceContainerHighest,
                        ),
                        FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: progress,
                          child: Container(color: colorScheme.primary),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
