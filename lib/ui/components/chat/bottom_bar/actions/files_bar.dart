import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/storage/file/file_utils.dart';
import 'package:novyse/core/storage/file/file_validators.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class FilesBar extends ConsumerWidget {
  const FilesBar({super.key, required this.chatUUID});

  final String chatUUID;

  static const int maxTotalSize = 100 * 1024 * 1024; // 100 MB
  static const int maxSingleSize = 50 * 1024 * 1024; // 50 MB
  static const int maxFiles = 10;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final draftState = ref.watch(chatDraftProvider(chatUUID));
    final files = draftState.files;

    if (files.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final totalSize = calculateTotalSize(files);
    final isNearLimit = (totalSize / maxTotalSize) > 0.8;

    final invalidFiles = draftState.invalidFiles;

    void handleClearAll() {
      ref.read(chatDraftProvider(chatUUID).notifier).setFiles([]);
      ref.read(chatDraftProvider(chatUUID).notifier).setInvalidFiles([]);
    }

    void handleRemoveFile(int index) {
      final updatedFiles = List<dynamic>.from(files)..removeAt(index);
      final draftNotifier = ref.read(chatDraftProvider(chatUUID).notifier);
      draftNotifier.setFiles(updatedFiles);

      final validation = validateFiles(
        updatedFiles,
        maxFiles: maxFiles,
        maxSingleSize: maxSingleSize,
        maxTotalSize: maxTotalSize,
      );
      draftNotifier.setInvalidFiles(
        validation.invalidFilesData.map((d) => d.toMap()).toList(),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isNearLimit
              ? AppColors.danger.withValues(alpha: 0.6)
              : colorScheme.outlineVariant.withValues(alpha: 0.4),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              AppHugeIcon(
                icon: HugeIcons.strokeRoundedFileAttachment,
                size: 18,
                color: colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Container(
                width: 3,
                height: 14,
                decoration: BoxDecoration(
                  color: colorScheme.primary,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Row(
                  children: [
                    Text(
                      l10n.filesCount(files.length),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${formatFileSize(totalSize)} / ${formatFileSize(maxTotalSize)}',
                      style: TextStyle(
                        fontSize: 12,
                        color: isNearLimit
                            ? AppColors.danger
                            : colorScheme.onSurfaceVariant,
                        fontWeight: isNearLimit
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              Tooltip(
                message: l10n.clearAllFilesTooltip,
                child: GestureDetector(
                  key: const Key('clear_all_files'),
                  behavior: HitTestBehavior.opaque,
                  onTap: handleClearAll,
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: AppHugeIcon(
                      icon: HugeIcons.strokeRoundedCancel01,
                      size: 16,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Divider(
            height: 1,
            thickness: 1,
            color: colorScheme.outlineVariant.withValues(alpha: 0.3),
          ),
          const SizedBox(height: 8),

          // Horizontal Files List
          SizedBox(
            height: 50,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              primary: false,
              physics: const ClampingScrollPhysics(),
              itemCount: files.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final file = files[index];
                dynamic invalidInfo;
                for (final item in invalidFiles) {
                  if (item is Map && item['index'] == index) {
                    invalidInfo = item;
                    break;
                  }
                }
                final isInvalid = invalidInfo != null;

                var fileName = 'File';
                var fileSize = 0;
                var mimeType = defaultMimeType;

                if (file is Map) {
                  fileName = (file['name'] ?? file['fileName'] ?? 'File')
                      .toString();
                  final sizeVal = file['size'] ?? file['fileSize'] ?? 0;
                  fileSize = sizeVal is num ? sizeVal.toInt() : 0;
                  mimeType = getMimeType(file);
                }

                final category = getFileType(mimeType, fileName);
                final icon = _getCategoryIcon(category);

                return Container(
                  key: ValueKey('file_chip_$fileName'),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isInvalid
                          ? AppColors.danger
                          : colorScheme.outlineVariant.withValues(alpha: 0.5),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AppHugeIcon(
                        icon: icon,
                        size: 18,
                        color: isInvalid
                            ? AppColors.danger
                            : colorScheme.primary,
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
                                color: isInvalid
                                    ? AppColors.danger
                                    : colorScheme.onSurface,
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
                        message: l10n.removeFileTooltip,
                        child: GestureDetector(
                          key: Key('remove_file_$index'),
                          behavior: HitTestBehavior.opaque,
                          onTap: () => handleRemoveFile(index),
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
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  List<List<dynamic>> _getCategoryIcon(FileTypeCategory category) {
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
}
