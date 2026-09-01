import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/edit_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/files_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/reply_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/left_button_bottom_bar.dart';
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
  });

  final String chatUUID;
  final int subID;
  final VoidCallback? onToggleAttachMenu;
  final bool isAttachMenuOpen;

  @override
  ConsumerState<DefaultBottomBar> createState() => _DefaultBottomBarState();
}

class _DefaultBottomBarState extends ConsumerState<DefaultBottomBar> {
  final FocusNode _focusNode = FocusNode();
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    // Initialize the shared controller with draft text if needed
    final draftText = ref
        .read(chatDraftProvider(widget.chatUUID))
        .newMessageText;
    final controller = ref.read(chatTextControllerProvider(widget.chatUUID));
    if (draftText.isNotEmpty && controller.text != draftText) {
      controller.text = draftText;
    }
  }

  @override
  void didUpdateWidget(covariant DefaultBottomBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID) {
      final draftText = ref
          .read(chatDraftProvider(widget.chatUUID))
          .newMessageText;
      final controller = ref.read(chatTextControllerProvider(widget.chatUUID));
      if (controller.text != draftText) {
        controller.text = draftText;
      }
    }
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _handleSendMessage() async {
    final controller = ref.read(chatTextControllerProvider(widget.chatUUID));
    final text = controller.text.trim();
    final draftState = ref.read(chatDraftProvider(widget.chatUUID));
    final files = List<dynamic>.from(draftState.files);

    // If both text and files are empty, or already sending, do nothing
    if ((text.isEmpty && files.isEmpty) || _isSending) return;

    // Check if there are invalid files
    if (draftState.invalidFiles.isNotEmpty) {
      final l10n = AppLocalizations.of(context)!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l10n.removeInvalidFilesBeforeSending),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    setState(() => _isSending = true);
    controller.clear();
    ref.read(chatDraftProvider(widget.chatUUID).notifier).setText('');
    ref.read(chatDraftProvider(widget.chatUUID).notifier).setFiles([]);
    ref.read(chatDraftProvider(widget.chatUUID).notifier).setInvalidFiles([]);

    try {
      final localUserUUID = ref.read(userStoreProvider).localUserUUID;
      final tempId = DateTime.now().millisecondsSinceEpoch;
      final now = DateTime.now().toUtc().toIso8601String();

      final queueManager = ref.read(queueManagerProvider);
      final filesPayload = files.isNotEmpty
          ? files.map((f) => Map<String, dynamic>.from(f as Map)).toList()
          : null;

      await queueManager.addOutgoingMessageJob(
        id: tempId.toString(),
        chatUUID: widget.chatUUID,
        subID: widget.subID,
        message: {
          'id': tempId,
          'chatUUID': widget.chatUUID,
          'subID': widget.subID,
          'senderUUID': localUserUUID,
          'userUUID': localUserUUID,
          'content': text,
          'type': 'message',
          'createdAt': now,
          'status': 'PENDING_SEND',
          'files': ?filesPayload,
        },
        files: filesPayload,
      );
    } catch (e) {
      debugPrint('[DefaultBottomBar] Error sending message via queue: $e');
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final chatUUID = widget.chatUUID;
    final textController = ref.watch(chatTextControllerProvider(chatUUID));
    final draftState = ref.watch(chatDraftProvider(chatUUID));
    final recorderState = ref.watch(voiceRecorderProvider(chatUUID));
    final recorderNotifier = ref.read(voiceRecorderProvider(chatUUID).notifier);

    final hasText = textController.text.trim().isNotEmpty;
    final hasFiles = draftState.files.isNotEmpty;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Edit Bar (Priority over Reply)
        EditBar(chatUUID: chatUUID),

        // Reply Bar
        ReplyBar(chatUUID: chatUUID),

        // Files Bar (Draft attachments)
        FilesBar(chatUUID: chatUUID),

        // Input Row
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            LeftButtonBottomBar(
              isRecording: recorderState.isRecording,
              isAttachMenuOpen: widget.isAttachMenuOpen,
              onToggleAttachMenu: widget.onToggleAttachMenu,
              onCancelRecording: () => recorderNotifier.cancelRecording(),
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
                onSendMessage: _handleSendMessage,
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
              onSendMessage: _handleSendMessage,
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
