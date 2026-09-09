import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/storage/file/draft_file_preview.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/storage/file/file_utils.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/huge_icon.dart';

const double kDraftChipBottomSlot = 8.0;

/// Standard chip for a draft file: leading icon, name, size and remove button.

class DraftFileChip extends StatelessWidget {
  const DraftFileChip({
    super.key,
    required this.fileName,
    required this.fileSize,
    required this.category,
    this.leadingOverride,
    this.bottomBar,
    this.isInvalid = false,
    required this.removeTooltip,
    required this.removeKey,
    required this.onTap,
    required this.onRemove,
  });

  final String fileName;
  final int fileSize;
  final FileTypeCategory category;
  final Widget? leadingOverride;
  final Widget? bottomBar;
  final bool isInvalid;
  final String removeTooltip;
  final Key removeKey;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final iconColor = isInvalid ? AppColors.danger : colorScheme.primary;

    Widget infoRow() {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          leadingOverride ??
              AppHugeIcon(
                icon: categoryIcon(category),
                size: 18,
                color: iconColor,
              ),
          const SizedBox(width: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 130),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  fileName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: isInvalid ? AppColors.danger : colorScheme.onSurface,
                  ),
                ),
                Text(
                  formatFileSize(fileSize),
                  style: TextStyle(
                    fontSize: 11,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Tooltip(
            message: removeTooltip,
            child: GestureDetector(
              key: removeKey,
              behavior: HitTestBehavior.opaque,
              onTap: onRemove,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: AppHugeIcon(
                  icon: HugeIcons.strokeRoundedCancel01,
                  size: 14,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ),
        ],
      );
    }

    // A Stack (instead of a stretching Column) keeps a finite width for the
    // chip inside the horizontal list. The bottom lane is always reserved so
    // audio and plain chips share the exact same height.
    final Widget content = Stack(
      children: [
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onTap,
              child: infoRow(),
            ),
            // Spacer reserving room for the bottom lane.
            const SizedBox(height: kDraftChipBottomSlot),
          ],
        ),
        if (bottomBar != null)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: kDraftChipBottomSlot,
            child: bottomBar!,
          ),
      ],
    );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isInvalid
              ? AppColors.danger
              : colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: content,
    );
  }
}

/// Category icon for a draft file chip.
List<List<dynamic>> categoryIcon(FileTypeCategory category) {
  switch (category) {
    case FileTypeCategory.image:
      return HugeIcons.strokeRoundedAlbum01;
    case FileTypeCategory.video:
      return HugeIcons.strokeRoundedVideo02;
    case FileTypeCategory.audio:
    case FileTypeCategory.voice:
      return HugeIcons.strokeRoundedMusicNote01;
    case FileTypeCategory.document:
    case FileTypeCategory.code:
    case FileTypeCategory.archive:
    case FileTypeCategory.other:
      return HugeIcons.strokeRoundedDocumentAttachment;
  }
}

/// Play/pause leading icon for audio/voice draft chips, reflecting the shared
/// [ChatAudioService] state for the given draft file.
class DraftAudioPlayIcon extends StatelessWidget {
  const DraftAudioPlayIcon({
    super.key,
    required this.chatUUID,
    required this.index,
    required this.color,
  });

  final String chatUUID;
  final int index;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final draftId = draftFileId(chatUUID, index);
    return ListenableBuilder(
      listenable: ChatAudioService.instance,
      builder: (context, _) {
        final isPlaying = ChatAudioService.instance.isItemPlaying(draftId);
        return AppHugeIcon(
          icon: isPlaying
              ? HugeIcons.strokeRoundedPause
              : HugeIcons.strokeRoundedPlay,
          size: 18,
          color: color,
        );
      },
    );
  }
}
