import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:markdown_editor_live/markdown_editor_live.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/chat/bottom_bar/context_menu.dart';

class ChatBottomBar extends ConsumerStatefulWidget {
  const ChatBottomBar({super.key, required this.chatUUID, this.subID = 0});

  final String chatUUID;
  final int subID;

  @override
  ConsumerState<ChatBottomBar> createState() => _ChatBottomBarState();
}

class _ChatBottomBarState extends ConsumerState<ChatBottomBar> {
  final MarkdownEditingController _textController = MarkdownEditingController();
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    final draftText = ref
        .read(chatDraftProvider(widget.chatUUID))
        .newMessageText;
    if (draftText.isNotEmpty) {
      _textController.text = draftText;
    }
  }

  @override
  void didUpdateWidget(covariant ChatBottomBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID) {
      final draftText = ref
          .read(chatDraftProvider(widget.chatUUID))
          .newMessageText;
      _textController.text = draftText;
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _isSending) return;

    setState(() => _isSending = true);
    _textController.clear();
    ref.read(chatDraftProvider(widget.chatUUID).notifier).setText('');

    try {
      final gateway = ref.read(apiGatewayProvider);
      final res = await gateway.message.send(
        widget.chatUUID,
        subID: widget.subID,
        content: text,
      );

      if (res.success && res.message != null) {
        final message = Map<String, dynamic>.from(res.message!);
        message['chatUUID'] ??= widget.chatUUID;
        message['subID'] ??= widget.subID;

        await ref.read(globalEventEmitterProvider).message.add(message);
      }
    } catch (e) {
      debugPrint('[ChatBottomBar] Error sending message: $e');
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          border: Border(
            top: BorderSide(
              color: colorScheme.outlineVariant.withValues(alpha: 0.4),
            ),
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest.withValues(
                    alpha: 0.6,
                  ),
                  borderRadius: BorderRadius.circular(24),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  controller: _textController,
                  textCapitalization: TextCapitalization.sentences,
                  maxLines: 4,
                  minLines: 1,
                  style: TextStyle(color: colorScheme.onSurface, fontSize: 15),
                  contextMenuBuilder: (context, editableTextState) {
                    return ChatContextMenu(
                      editableTextState: editableTextState,
                      controller: _textController,
                    );
                  },
                  decoration: InputDecoration(
                    hintText: l10n.typeMessageHint,
                    hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onChanged: (text) {
                    ref
                        .read(chatDraftProvider(widget.chatUUID).notifier)
                        .setText(text);
                  },
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _sendMessage,
              icon: _isSending
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: colorScheme.onPrimary,
                      ),
                    )
                  : const Icon(Icons.send_rounded, size: 20),
            ),
          ],
        ),
      ),
    );
  }
}
