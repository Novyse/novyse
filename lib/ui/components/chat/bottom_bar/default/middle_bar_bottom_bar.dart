import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:markdown_editor_live/markdown_editor_live.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/shortcuts/chat_shortcuts.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/chat/bottom_bar/context_menu.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/speech_indicator.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/voice_recorder_controller.dart';
import 'package:novyse/ui/components/chat/paste/chat_paste_helper.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
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
    this.isEmojiMenuOpen = false,
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
  final bool isEmojiMenuOpen;
  final FocusNode? focusNode;

  @override
  ConsumerState<MiddleBarBottomBar> createState() => _MiddleBarBottomBarState();
}

class _MiddleBarBottomBarState extends ConsumerState<MiddleBarBottomBar> {
  static const double _compactTimerBreakpoint = 300.0;

  FocusNode? _internalFocusNode;

  FocusNode get _effectiveFocusNode =>
      widget.focusNode ?? (_internalFocusNode ??= FocusNode());

  @override
  void initState() {
    super.initState();
    _effectiveFocusNode.onKeyEvent = _onKeyEvent;
  }

  @override
  void didUpdateWidget(covariant MiddleBarBottomBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.focusNode != widget.focusNode) {
      oldWidget.focusNode?.onKeyEvent = null;
      _effectiveFocusNode.onKeyEvent = _onKeyEvent;
    }
  }

  @override
  void dispose() {
    _effectiveFocusNode.onKeyEvent = null;
    _internalFocusNode?.dispose();
    super.dispose();
  }

  KeyEventResult _onKeyEvent(FocusNode node, KeyEvent event) {
    return ChatKeyboardHandler.handleKeyEvent(
      event: event,
      ref: ref,
      context: context,
      chatUUID: widget.chatUUID,
      subID: widget.subID,
      textController: widget.textController,
      focusNode: _effectiveFocusNode,
      onSendMessage: widget.onSendMessage,
    );
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes;
    final seconds = d.inSeconds % 60;
    final millis = (d.inMilliseconds % 1000).toString().padLeft(3, '0');
    return '$minutes:${seconds.toString().padLeft(2, '0')}.$millis';
  }

  String _formatShortDuration(Duration d) {
    final minutes = d.inMinutes;
    final seconds = d.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
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
          selection: TextSelection.collapsed(offset: start + text.length),
        );
      } else {
        final newText = '$currentText$text';
        controller.value = TextEditingValue(
          text: newText,
          selection: TextSelection.collapsed(offset: newText.length),
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
      return FloatingPill(
        radius: FloatingConsts.centralRadius,
        padding: FloatingConsts.iconPillPadding,
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            // 44 content + 4 glass = 48, exactly like every other pill.
            // (Full 48 here would stack on the padding and make 52.)
            minHeight: FloatingConsts.barContentSize,
          ),
          child: Actions(
            actions: {
              PasteTextIntent: CallbackAction<PasteTextIntent>(
                onInvoke: (intent) async {
                  return await _handlePaste();
                },
              ),
            },
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: widget.textController,
                    focusNode: _effectiveFocusNode,
                    textCapitalization: TextCapitalization.sentences,
                    maxLines: 4,
                    minLines: 1,
                    textAlignVertical: TextAlignVertical.center,
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontSize: 15,
                    ),
                    contentInsertionConfiguration:
                        ContentInsertionConfiguration(
                          allowedMimeTypes: const <String>[
                            'image/png',
                            'image/jpeg',
                            'image/gif',
                            'image/webp',
                            'image/heic',
                            'image/svg+xml',
                          ],
                          onContentInserted:
                              (KeyboardInsertedContent data) async {
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
                      filled: false,
                      hintText: l10n.typeMessageHint,
                      hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.fromLTRB(16, 10, 0, 10),
                      // Keeps one line 44 tall, with the hint centered,
                      // without taking a column the emoji button would
                      // follow as the field grows.
                      suffixIconConstraints: const BoxConstraints.tightFor(
                        width: 0,
                        height: FloatingConsts.barContentSize,
                      ),
                      suffixIcon: const SizedBox.shrink(),
                    ),
                    onChanged: (text) {
                      ref
                          .read(chatDraftProvider(widget.chatUUID).notifier)
                          .setText(text);
                    },
                    onSubmitted: (_) => widget.onSendMessage(),
                  ),
                ),
                FloatingIconButton(
                  icon: AppHugeIcon(
                    icon: widget.isEmojiMenuOpen
                        ? HugeIcons.strokeRoundedKeyboard
                        : HugeIcons.strokeRoundedSmile,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  onPressed: widget.onToggleEmoji,
                  tooltip: l10n.emojiTooltip,
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Recording Mode
    return FloatingPill(
      radius: FloatingConsts.centralRadius,
      padding: FloatingConsts.centralTitlePadding,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compactTimer = constraints.maxWidth < _compactTimerBreakpoint;
          final duration = _buildRecordingDuration(
            colorScheme,
            compact: compactTimer,
          );
          final waveform = _buildRecordingWaveform();
          final actions = _buildRecordingActions(l10n, colorScheme);

          return ConstrainedBox(
            constraints: const BoxConstraints(
              minHeight: FloatingConsts.centralMinHeight,
            ),
            child: Row(
              children: [
                duration,
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: waveform,
                  ),
                ),
                actions,
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildRecordingDuration(
    ColorScheme colorScheme, {
    required bool compact,
  }) {
    return SizedBox(
      width: compact ? 44 : 72,
      child: Text(
        compact
            ? _formatShortDuration(widget.recorderState.duration)
            : _formatDuration(widget.recorderState.duration),
        style: TextStyle(
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
    );
  }

  Widget _buildRecordingWaveform() {
    return SpeechIndicator(
      samples: widget.recorderState.waveform,
      color: Theme.of(context).colorScheme.primary,
      barWidth: 3.0,
      barGap: 2.5,
      height: 22.0,
    );
  }

  Widget _buildRecordingActions(
    AppLocalizations l10n,
    ColorScheme colorScheme,
  ) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: AppHugeIcon(
            icon: HugeIcons.strokeRoundedPlus,
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
    );
  }
}
