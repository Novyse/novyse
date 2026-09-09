import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/message_file.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/storage/file/draft_file_preview.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/storage/file/file_utils.dart';
import 'package:novyse/core/storage/file/file_validators.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/draft_audio_seek_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/draft_file_chip.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class FilesBar extends ConsumerStatefulWidget {
  const FilesBar({super.key, required this.chatUUID});

  final String chatUUID;

  static const int maxTotalSize = 100 * 1024 * 1024; // 100 MB
  static const int maxSingleSize = 50 * 1024 * 1024; // 50 MB
  static const int maxFiles = 10;

  @override
  ConsumerState<FilesBar> createState() => _FilesBarState();
}

class _FilesBarState extends ConsumerState<FilesBar> {
  late final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  /// Routes wheel/trackpad vertical scroll to the horizontal files list
  /// (desktop/web ignore wheel events on horizontal lists by default).
  void _handleWheel(PointerSignalEvent signal) {
    if (signal is! PointerScrollEvent || signal.scrollDelta.dy == 0) return;
    final position = _scrollController.position;
    if (!position.hasContentDimensions ||
        position.maxScrollExtent <= position.minScrollExtent) {
      return;
    }
    final target = (position.pixels + signal.scrollDelta.dy).clamp(
      position.minScrollExtent,
      position.maxScrollExtent,
    );
    _scrollController.jumpTo(target);
  }

  @override
  Widget build(BuildContext context) {
    final chatUUID = widget.chatUUID;
    final l10n = AppLocalizations.of(context)!;
    final draftState = ref.watch(chatDraftProvider(chatUUID));
    final files = draftState.files;

    if (files.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final totalSize = calculateTotalSize(files);
    final isNearLimit = (totalSize / FilesBar.maxTotalSize) > 0.8;

    final invalidFiles = draftState.invalidFiles;

    // Show the scrollbar thumb where no touch scrolling exists.
    final showScrollbar = switch (theme.platform) {
      TargetPlatform.linux ||
      TargetPlatform.macOS ||
      TargetPlatform.windows => true,
      _ => kIsWeb,
    };

    void handleClearAll() {
      // Stop any draft preview playback and drop cached web blob URLs.
      stopDraftAudioForChat(chatUUID);
      revokeDraftBlobsForChat(chatUUID);
      final draftNotifier = ref.read(chatDraftProvider(chatUUID).notifier);
      draftNotifier.setFiles([]);
      draftNotifier.setInvalidFiles([]);
    }

    void handleRemoveFile(int index) {
      if (index < 0 || index >= files.length) return;
      revokeDraftBlobForFile(chatUUID, files[index]);
      stopDraftAudioForChat(chatUUID);
      final updatedFiles = List<dynamic>.from(files)..removeAt(index);
      final draftNotifier = ref.read(chatDraftProvider(chatUUID).notifier);
      draftNotifier.setFiles(updatedFiles);

      final validation = validateFiles(
        updatedFiles,
        maxFiles: FilesBar.maxFiles,
        maxSingleSize: FilesBar.maxSingleSize,
        maxTotalSize: FilesBar.maxTotalSize,
      );
      draftNotifier.setInvalidFiles(
        validation.invalidFilesData.map((d) => d.toMap()).toList(),
      );
    }

    /// Routes a tap on a chip to the preview matching its category:
    /// audio/voice toggles inline playback (single track at a time via
    /// [ChatAudioService]), image/video open the shared media viewer gallery,
    /// everything else opens with the system default.
    Future<void> handlePreviewTap(
      dynamic file,
      int index,
      MessageFile messageFile,
    ) async {
      if (messageFile.isAudio || messageFile.isVoice) {
        await toggleDraftAudioPlayback(
          chatUUID: chatUUID,
          index: index,
          file: file,
          durationSeconds: messageFile.duration,
        );
        return;
      }
      if (messageFile.isImage || messageFile.isVideo) {
        await openDraftMediaGallery(
          context,
          chatUUID: chatUUID,
          files: files,
          tappedIndex: index,
        );
      } else {
        await openDraftFileWithSystem(context, file: file, chatUUID: chatUUID);
      }
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
                    if (files.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Text(
                        '${formatFileSize(totalSize)} / ${formatFileSize(FilesBar.maxTotalSize)}',
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
                  ],
                ),
              ),
              if (files.isNotEmpty) ...[
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
            ],
          ),
          if (files.isNotEmpty) ...[
            const SizedBox(height: 8),
            Divider(
              height: 1,
              thickness: 1,
              color: colorScheme.outlineVariant.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 8),

            // Horizontal Files List. The bottom padding reserves a lane for
            // the slim scrollbar so it never overlaps the chips' seek bars.
            SizedBox(
              height: 62,
              child: Listener(
                onPointerSignal: _handleWheel,
                child: RawScrollbar(
                  controller: _scrollController,
                  thumbVisibility: showScrollbar,
                  trackVisibility: false,
                  thickness: 4,
                  radius: const Radius.circular(2),
                  crossAxisMargin: 2,
                  minThumbLength: 24,
                  child: ListView.separated(
                    controller: _scrollController,
                    padding: const EdgeInsets.only(bottom: 8),
                    scrollDirection: Axis.horizontal,
                    primary: false,
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: files.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(width: 8),
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

                      final messageFile = draftMessageFile(
                        file,
                        chatUUID: chatUUID,
                        index: index,
                      );
                      final fileName = messageFile.name.isNotEmpty
                          ? messageFile.name
                          : 'File';
                      final category = getFileType(
                        messageFile.mimeType,
                        fileName,
                      );
                      final isAudioOrVoice =
                          messageFile.isAudio || messageFile.isVoice;
                      final iconColor = isInvalid
                          ? AppColors.danger
                          : colorScheme.primary;

                      return DraftFileChip(
                        key: ValueKey('file_chip_$fileName'),
                        fileName: fileName,
                        fileSize: messageFile.size,
                        category: category,
                        leadingOverride: isAudioOrVoice
                            ? DraftAudioPlayIcon(
                                chatUUID: chatUUID,
                                index: index,
                                color: iconColor,
                              )
                            : null,
                        bottomBar: isAudioOrVoice
                            ? DraftAudioSeekBar(
                                chatUUID: chatUUID,
                                index: index,
                                file: file,
                                durationSeconds: messageFile.duration,
                              )
                            : null,
                        isInvalid: isInvalid,
                        removeTooltip: l10n.removeFileTooltip,
                        removeKey: Key('remove_file_$index'),
                        onTap: () => handlePreviewTap(file, index, messageFile),
                        onRemove: () => handleRemoveFile(index),
                      );
                    },
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
