import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/edit_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/files_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/mention_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/reply_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/left_button_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/message_send_handler.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/middle_bar_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/right_button_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/voice_recorder_controller.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji_menu_overlay.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_send_handler.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';

class DefaultBottomBar extends ConsumerStatefulWidget {
  const DefaultBottomBar({
    super.key,
    required this.chatUUID,
    required this.focusNode,
    this.subID = 0,
    this.onToggleEmojiMenu,
    this.isEmojiMenuOpen = false,
    this.onCloseEmojiMenu,
  });

  final String chatUUID;
  final int subID;
  final FocusNode focusNode;
  final VoidCallback? onToggleEmojiMenu;
  final bool isEmojiMenuOpen;
  final VoidCallback? onCloseEmojiMenu;

  @override
  ConsumerState<DefaultBottomBar> createState() => _DefaultBottomBarState();
}

class _DefaultBottomBarState extends ConsumerState<DefaultBottomBar> {
  final LayerLink _emojiMenuLink = LayerLink();
  OverlayEntry? _emojiMenuEntry;
  bool _isSending = false;
  TextEditingController? _textController;

  FocusNode get _focusNode => widget.focusNode;

  @override
  void initState() {
    super.initState();
    final draftText = ref
        .read(chatDraftProvider(widget.chatUUID))
        .newMessageText;
    _textController = ref.read(chatTextControllerProvider(widget.chatUUID));
    if (draftText.isNotEmpty && _textController!.text != draftText) {
      _textController!.text = draftText;
    }
    _textController!.addListener(_onControllerChanged);
  }

  void _onControllerChanged() {
    if (mounted) setState(() {});
  }

  @override
  void didUpdateWidget(covariant DefaultBottomBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID) {
      _textController?.removeListener(_onControllerChanged);

      _textController = ref.read(chatTextControllerProvider(widget.chatUUID));
      _textController!.addListener(_onControllerChanged);

      final draftText = ref
          .read(chatDraftProvider(widget.chatUUID))
          .newMessageText;
      if (_textController!.text != draftText) {
        _textController!.text = draftText;
      }
    }
    if (widget.isEmojiMenuOpen != oldWidget.isEmojiMenuOpen ||
        widget.chatUUID != oldWidget.chatUUID) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _syncEmojiMenuOverlay(),
      );
    }
    if (oldWidget.chatUUID != widget.chatUUID && widget.isEmojiMenuOpen) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _syncEmojiMenuOverlay(),
      );
    }
  }

  void _syncEmojiMenuOverlay() {
    if (!mounted) return;
    // Mobile uses ChatBottomPanelContainer; only desktop/web use Overlay.
    if (currentPlatform == AppPlatform.mobile) {
      _hideEmojiMenuOverlay();
      return;
    }
    if (widget.isEmojiMenuOpen) {
      _showEmojiMenuOverlay();
    } else {
      _hideEmojiMenuOverlay();
    }
  }

  void _showEmojiMenuOverlay() {
    if (_emojiMenuEntry != null) return;
    final overlay = Overlay.maybeOf(context);
    if (overlay == null) return;
    final textController = ref.read(
      chatTextControllerProvider(widget.chatUUID),
    );
    _emojiMenuEntry = OverlayEntry(
      builder: (context) => EmojiMenuOverlay(
        link: _emojiMenuLink,
        textController: textController,
        onSelectGif: _handleSelectGif,
        onClose: () => widget.onCloseEmojiMenu?.call(),
      ),
    );
    overlay.insert(_emojiMenuEntry!);
  }

  void _hideEmojiMenuOverlay() {
    _emojiMenuEntry?.remove();
    _emojiMenuEntry = null;
  }

  Future<void> _handleSelectGif(GifItem gif) async {
    try {
      await GifSendHandler.sendGif(
        ref: ref,
        chatUUID: widget.chatUUID,
        subID: widget.subID,
        gif: gif,
      );
    } catch (_) {
      return;
    }
    widget.onCloseEmojiMenu?.call();
  }

  @override
  void dispose() {
    _hideEmojiMenuOverlay();
    _textController?.removeListener(_onControllerChanged);
    _textController = null;
    super.dispose();
  }

  MessageSendHandler get _sendHandler => MessageSendHandler(
    ref: ref,
    context: context,
    chatUUID: widget.chatUUID,
    subID: widget.subID,
    onSendingChanged: (sending) {
      if (mounted) setState(() => _isSending = sending);
    },
  );

  Future<void> _handleSendMessage() => _sendHandler.handleSendMessage();
  Future<void> _handleEditMessage() => _sendHandler.handleEditMessage();

  @override
  Widget build(BuildContext context) {
    final chatUUID = widget.chatUUID;
    final textController = ref.watch(chatTextControllerProvider(chatUUID));
    final draftState = ref.watch(chatDraftProvider(chatUUID));
    final recorderState = ref.watch(voiceRecorderProvider(chatUUID));
    final recorderNotifier = ref.read(voiceRecorderProvider(chatUUID).notifier);

    final isEditing = draftState.editingMessage != null;
    final hasText = textController.text.trim().isNotEmpty;
    final hasFiles = draftState.files.isNotEmpty;

    ref.listen<ChatDraftState>(chatDraftProvider(chatUUID), (previous, next) {
      if ((previous?.editingMessage?.id != next.editingMessage?.id &&
              next.editingMessage != null) ||
          (previous?.replyingTo.length != next.replyingTo.length &&
              next.replyingTo.isNotEmpty)) {
        _focusNode.requestFocus();
      }
    });

    final onSendMessage = isEditing ? _handleEditMessage : _handleSendMessage;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MentionBar(chatUUID: chatUUID, focusNode: _focusNode),
        EditBar(chatUUID: chatUUID),
        ReplyBar(chatUUID: chatUUID),
        FilesBar(chatUUID: chatUUID),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            LeftButtonBottomBar(
              chatUUID: chatUUID,
              isRecording: recorderState.isRecording,
              onCancelRecording: () => recorderNotifier.cancelRecording(),
            ),
            const SizedBox(width: FloatingConsts.pillSpacing),
            Expanded(
              child: CompositedTransformTarget(
                link: _emojiMenuLink,
                child: MiddleBarBottomBar(
                  chatUUID: chatUUID,
                  subID: widget.subID,
                  textController: textController,
                  focusNode: _focusNode,
                  isRecording: recorderState.isRecording,
                  recorderState: recorderState,
                  onSendMessage: onSendMessage,
                  onTogglePause: () => recorderNotifier.togglePause(),
                  onStopAndDraft: () => recorderNotifier.stopAndDraft(),
                  onToggleEmoji: widget.onToggleEmojiMenu,
                  isEmojiMenuOpen: widget.isEmojiMenuOpen,
                ),
              ),
            ),
            const SizedBox(width: FloatingConsts.pillSpacing),
            RightButtonBottomBar(
              isRecording: recorderState.isRecording,
              hasText: hasText,
              hasFiles: hasFiles,
              isSending: _isSending,
              onSendMessage: onSendMessage,
              onStartRecording: () => recorderNotifier.startRecording(),
              onStopAndSend: () =>
                  recorderNotifier.stopAndSend(subID: widget.subID),
            ),
          ],
        ),
      ],
    );
  }
}
