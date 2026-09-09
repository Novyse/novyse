import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/edit_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/files_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/mention_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/reply_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu_overlay.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/left_button_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/message_send_handler.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/middle_bar_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/right_button_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/recording/voice_recorder_controller.dart';

class DefaultBottomBar extends ConsumerStatefulWidget {
  const DefaultBottomBar({
    super.key,
    required this.chatUUID,
    this.subID = 0,
    this.onToggleAttachMenu,
    this.isAttachMenuOpen = false,
    this.onCloseAttachMenu,
  });

  final String chatUUID;
  final int subID;
  final VoidCallback? onToggleAttachMenu;
  final bool isAttachMenuOpen;
  final VoidCallback? onCloseAttachMenu;

  @override
  ConsumerState<DefaultBottomBar> createState() => _DefaultBottomBarState();
}

class _DefaultBottomBarState extends ConsumerState<DefaultBottomBar> {
  final FocusNode _focusNode = FocusNode();
  final LayerLink _attachMenuLink = LayerLink();
  OverlayEntry? _attachMenuEntry;
  bool _isSending = false;
  TextEditingController? _textController;

  @override
  void initState() {
    super.initState();
    // Initialize the shared controller with draft text if needed
    final draftText = ref
        .read(chatDraftProvider(widget.chatUUID))
        .newMessageText;
    _textController = ref.read(chatTextControllerProvider(widget.chatUUID));
    if (draftText.isNotEmpty && _textController!.text != draftText) {
      _textController!.text = draftText;
    }
    _textController!.addListener(_onControllerChanged);
    _focusNode.addListener(_onFocusChanged);
  }

  void _onControllerChanged() {
    if (mounted) setState(() {});
  }

  /// Closes the attach menu when the text input gains focus,
  void _onFocusChanged() {
    if (_focusNode.hasFocus && widget.isAttachMenuOpen) {
      widget.onCloseAttachMenu?.call();
    }
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
    if (widget.isAttachMenuOpen != oldWidget.isAttachMenuOpen ||
        widget.chatUUID != oldWidget.chatUUID) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _syncAttachMenuOverlay(),
      );
    }
  }

  void _syncAttachMenuOverlay() {
    if (!mounted) return;
    if (widget.isAttachMenuOpen) {
      _showAttachMenuOverlay();
    } else {
      _hideAttachMenuOverlay();
    }
  }

  void _showAttachMenuOverlay() {
    if (_attachMenuEntry != null) return;
    final overlay = Overlay.maybeOf(context);
    if (overlay == null) return;
    _attachMenuEntry = OverlayEntry(
      builder: (context) => AttachMenuOverlay(
        link: _attachMenuLink,
        chatUUID: widget.chatUUID,
        onClose: () => widget.onCloseAttachMenu?.call(),
      ),
    );
    overlay.insert(_attachMenuEntry!);
  }

  void _hideAttachMenuOverlay() {
    _attachMenuEntry?.remove();
    _attachMenuEntry = null;
  }

  @override
  void dispose() {
    _hideAttachMenuOverlay();
    _textController?.removeListener(_onControllerChanged);
    _focusNode.removeListener(_onFocusChanged);
    _textController = null;
    _focusNode.dispose();
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

    // Automatically focus the input field when entering edit mode
    ref.listen<ChatDraftState>(chatDraftProvider(chatUUID), (previous, next) {
      if (previous?.editingMessage?.id != next.editingMessage?.id &&
          next.editingMessage != null) {
        _focusNode.requestFocus();
      }
    });

    final onSendMessage = isEditing ? _handleEditMessage : _handleSendMessage;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Mention Bar
        MentionBar(
          chatUUID: chatUUID,
          focusNode: _focusNode,
        ),

        // Edit Bar (Priority over Reply)
        EditBar(chatUUID: chatUUID),

        // Reply Bar
        ReplyBar(chatUUID: chatUUID),

        // Files Bar (Draft attachments & edit files)
        FilesBar(chatUUID: chatUUID),

        // Input Row
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            CompositedTransformTarget(
              link: _attachMenuLink,
              child: LeftButtonBottomBar(
                isRecording: recorderState.isRecording,
                isAttachMenuOpen: widget.isAttachMenuOpen,
                onToggleAttachMenu: widget.onToggleAttachMenu,
                onCancelRecording: () => recorderNotifier.cancelRecording(),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
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
              ),
            ),
            const SizedBox(width: 8),
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
