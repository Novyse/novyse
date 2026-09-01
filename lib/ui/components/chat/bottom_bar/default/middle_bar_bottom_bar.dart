import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:markdown_editor_live/markdown_editor_live.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/chat/bottom_bar/context_menu.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/recording_dot.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/speech_indicator.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/voice_recorder_controller.dart';
import 'package:novyse/ui/components/chat/paste/chat_paste_helper.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class MiddleBarBottomBar extends ConsumerStatefulWidget {
  const MiddleBarBottomBar({
    super.key,
    required this.chatUUID,
    this.subID = 0,
    required this.textController,
    required this.isRecording,
    required this.recorderState,
    required this.onSendMessage,
    required this.onTogglePause,
    required this.onStopAndDraft,
    this.onToggleEmoji,
    this.focusNode,
  });

  final String chatUUID;
  final int subID;
  final MarkdownEditingController textController;
  final bool isRecording;
  final VoiceRecorderState recorderState;
  final VoidCallback onSendMessage;
  final VoidCallback onTogglePause;
  final VoidCallback onStopAndDraft;
  final VoidCallback? onToggleEmoji;
  final FocusNode? focusNode;

  @override
  ConsumerState<MiddleBarBottomBar> createState() => _MiddleBarBottomBarState();
}

class _MiddleBarBottomBarState extends ConsumerState<MiddleBarBottomBar> {
  String _formatDuration(Duration d) {
    final minutes = d.inMinutes;
    final seconds = d.inSeconds % 60;
    final millis = (d.inMilliseconds % 1000).toString().padLeft(3, '0');
    return '$minutes:${seconds.toString().padLeft(2, '0')}.$millis';
  }

  Future<bool> _handlePaste() async {
    // 1. Try super_clipboard image / files first (Desktop / Mobile / Web)
    final pastedMedia = await ChatPasteHelper.pasteFromClipboard(
      ref,
      widget.chatUUID,
    );
    if (pastedMedia) return true;

    // 2. Check if clipboard text is a local file path or file:// URI (Desktop / Android)
    final clipData = await Clipboard.getData(Clipboard.kTextPlain);
    final text = clipData?.text;

    if (text != null && text.isNotEmpty) {
      if (!kIsWeb &&
          await ChatPasteHelper.tryAttachFromPathOrUri(
            ref,
            widget.chatUUID,
            text,
          )) {
        return true;
      }

      // 3. Otherwise paste text into input field
      final controller = widget.textController;
      final selection = controller.selection;
      final currentText = controller.text;
      if (selection.isValid &&
          selection.start >= 0 &&
          selection.end <= currentText.length) {
        final start = selection.start;
        final end = selection.end;
        final newText = currentText.replaceRange(start, end, text);
        controller.value = TextEditingValue(
          text: newText,
          selection: TextSelection.collapsed(
            offset: start + text.length,
          ),
        );
      } else {
        final newText = '$currentText$text';
        controller.value = TextEditingValue(
          text: newText,
          selection: TextSelection.collapsed(
            offset: newText.length,
          ),
        );
      }
      ref
          .read(chatDraftProvider(widget.chatUUID).notifier)
          .setText(controller.text);
      return true;
    }

    return false;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (!widget.isRecording) {
      return Container(
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.65),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: colorScheme.outlineVariant.withValues(alpha: 0.5),
            width: 1.0,
          ),
        ),
        child: Actions(
          actions: {
            PasteTextIntent: CallbackAction<PasteTextIntent>(
              onInvoke: (intent) async {
                return await _handlePaste();
              },
            ),
          },
          child: TextField(
            controller: widget.textController,
            focusNode: widget.focusNode,
            textCapitalization: TextCapitalization.sentences,
            maxLines: 4,
            minLines: 1,
            style: TextStyle(color: colorScheme.onSurface, fontSize: 15),
            contentInsertionConfiguration: ContentInsertionConfiguration(
              allowedMimeTypes: const <String>[
                'image/png',
                'image/jpeg',
                'image/gif',
                'image/webp',
                'image/heic',
                'image/svg+xml',
              ],
              onContentInserted: (KeyboardInsertedContent data) async {
                await ChatPasteHelper.handleKeyboardInserted(
                  ref,
                  widget.chatUUID,
                  data,
                  subID: widget.subID,
                );
              },
            ),
            contextMenuBuilder: (context, editableTextState) {
              return ChatContextMenu(
                editableTextState: editableTextState,
                controller: widget.textController,
                onPaste: () async {
                  await _handlePaste();
                },
              );
            },
            decoration: InputDecoration(
              hintText: l10n.typeMessageHint,
              hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
              border: InputBorder.none,
              isDense: true,
              contentPadding: const EdgeInsets.fromLTRB(16, 11, 4, 11),
              suffixIcon: IconButton(
                icon: AppHugeIcon(
                  icon: HugeIcons.strokeRoundedSmile,
                  size: 20,
                  color: colorScheme.onSurfaceVariant,
                ),
                onPressed: widget.onToggleEmoji,
                tooltip: l10n.emojiTooltip,
                splashRadius: 20,
              ),
            ),
            onChanged: (text) {
              ref
                  .read(chatDraftProvider(widget.chatUUID).notifier)
                  .setText(text);
            },
            onSubmitted: (_) => widget.onSendMessage(),
          ),
        ),
      );
    }

    // Recording Mode
    return Container(
      height: 45,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Row(
        children: [
          // Recording Dot + Duration
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              RecordingDot(isRecording: !widget.recorderState.isPaused),
              const SizedBox(width: 8),
              SizedBox(
                width: 72,
                child: Text(
                  _formatDuration(widget.recorderState.duration),
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
            ],
          ),

          // Speech Indicator Visualizer
          Expanded(
            child: Center(
              child: SpeechIndicator(
                audioLevel: widget.recorderState.amplitude,
                color: colorScheme.primary,
                barWidth: 3.0,
                maxHeight: 22.0,
              ),
            ),
          ),

          // Actions Container: Add to draft (+) & Pause/Resume
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: AppHugeIcon(
                  icon: HugeIcons.strokeRoundedAdd01,
                  size: 20,
                  color: colorScheme.onSurface,
                ),
                onPressed: widget.onStopAndDraft,
                tooltip: l10n.addToDraftTooltip,
                splashRadius: 20,
              ),
              IconButton(
                icon: AppHugeIcon(
                  icon: widget.recorderState.isPaused
                      ? HugeIcons.strokeRoundedPlay
                      : HugeIcons.strokeRoundedPause,
                  size: 20,
                  color: colorScheme.onSurface,
                ),
                onPressed: widget.onTogglePause,
                tooltip: widget.recorderState.isPaused
                    ? l10n.resumeTooltip
                    : l10n.pauseTooltip,
                splashRadius: 20,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
