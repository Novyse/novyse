import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';

import 'chat_routes.dart';

class ChatDetailPage extends ConsumerStatefulWidget {
  const ChatDetailPage({super.key, required this.chatUUID});

  final String chatUUID;

  @override
  ConsumerState<ChatDetailPage> createState() => _ChatDetailPageState();
}

class _ChatDetailPageState extends ConsumerState<ChatDetailPage> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref
            .read(activeChatProvider.notifier)
            .setSelectedChatUUID(widget.chatUUID);
        ref
            .read(
              chatMessagesProvider((
                chatUUID: widget.chatUUID,
                subID: 0,
              )).notifier,
            )
            .init();
      }
    });

    final draftText =
        ref.read(chatDraftProvider(widget.chatUUID)).newMessageText;
    if (draftText.isNotEmpty) {
      _textController.text = draftText;
    }
  }

  @override
  void didUpdateWidget(covariant ChatDetailPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ref
              .read(activeChatProvider.notifier)
              .setSelectedChatUUID(widget.chatUUID);
          ref
              .read(
                chatMessagesProvider((
                  chatUUID: widget.chatUUID,
                  subID: 0,
                )).notifier,
              )
              .init();
        }
      });
      final draftText =
          ref.read(chatDraftProvider(widget.chatUUID)).newMessageText;
      _textController.text = draftText;
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
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
        subID: 0,
        content: text,
      );

      if (res.success && res.message != null) {
        ref
            .read(
              chatMessagesProvider((chatUUID: widget.chatUUID, subID: 0))
                  .notifier,
            )
            .onNewMessage(res.message!);
      }
    } catch (e) {
      debugPrint('[ChatDetailPage] Error sending message: $e');
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  Widget _buildAvatar(ResolvedChatMetadata metadata) {
    final scheme = [const Color(0xFF4F46E5), const Color(0xFF7C3AED)];

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: scheme,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: metadata.isSavedMessages
            ? const Icon(Icons.bookmark_rounded, color: Colors.white, size: 20)
            : Text(
                metadata.name.isNotEmpty
                    ? metadata.name.substring(0, 1).toUpperCase()
                    : '?',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final chatUUID = widget.chatUUID;
    final chat = ref.watch(chatProvider(chatUUID));
    final l10n = AppLocalizations.of(context)!;

    if (chat == null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(l10n.chatTitle),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => popOrChats(context),
          ),
        ),
        body: Center(child: Text(l10n.chatNotFoundWithId(chatUUID))),
      );
    }

    final localUserUUID = ref.watch(
      userStoreProvider.select((s) => s.localUserUUID),
    );
    final users = ref.watch(userStoreProvider.select((s) => s.users));
    final metadata = resolveChatMetadata(
      chat: chat,
      localUserUUID: localUserUUID,
      users: users,
      l10n: l10n,
    );

    final messagesState = ref.watch(
      chatMessagesProvider((chatUUID: chatUUID, subID: 0)),
    );
    final messages = messagesState.messages;

    String subtitleText;
    if (metadata.isSavedMessages) {
      subtitleText = '';
    } else if (chat.type == 'DM') {
      subtitleText = metadata.isOnline ? l10n.online : l10n.offline;
    } else {
      subtitleText = l10n.membersCount(chat.members.length);
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => popOrChats(context),
        ),
        titleSpacing: 0,
        title: Row(
          children: [
            _buildAvatar(metadata),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    metadata.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (subtitleText.isNotEmpty)
                    Text(
                      subtitleText,
                      style: TextStyle(
                        fontSize: 12,
                        color: metadata.isOnline
                            ? colorScheme.primary
                            : colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Messages List
          Expanded(
            child: messagesState.loading && messages.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    reverse: true,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final message = messages[index];
                      final isMe = message.userUUID == localUserUUID;
                      final sender = users[message.userUUID];
                      final senderName = sender?.displayName.isNotEmpty == true
                          ? sender!.displayName
                          : (sender?.handle?.isNotEmpty == true
                                ? '@${sender!.handle}'
                                : '');

                      final timeFormat = DateFormat('HH:mm');
                      final timeStr =
                          timeFormat.format(message.createdAt.toLocal());

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Align(
                          alignment: isMe
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: MediaQuery.sizeOf(context).width * 0.76,
                            ),
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: isMe
                                    ? colorScheme.primary
                                    : colorScheme.surfaceContainerHighest,
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(18),
                                  topRight: const Radius.circular(18),
                                  bottomLeft: Radius.circular(isMe ? 18 : 4),
                                  bottomRight: Radius.circular(isMe ? 4 : 18),
                                ),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 8,
                                ),
                                child: Column(
                                  crossAxisAlignment: isMe
                                      ? CrossAxisAlignment.end
                                      : CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (!isMe &&
                                        chat.type != 'DM' &&
                                        senderName.isNotEmpty)
                                      Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 3,
                                        ),
                                        child: Text(
                                          senderName,
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: colorScheme.primary,
                                          ),
                                        ),
                                      ),
                                    Text(
                                      message.content ?? '',
                                      style: TextStyle(
                                        fontSize: 15,
                                        color: isMe
                                            ? colorScheme.onPrimary
                                            : colorScheme.onSurface,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        if (message.edited)
                                          Padding(
                                            padding: const EdgeInsets.only(
                                              right: 4,
                                            ),
                                            child: Text(
                                              l10n.edited,
                                              style: TextStyle(
                                                fontSize: 10,
                                                color:
                                                    (isMe
                                                            ? colorScheme
                                                                  .onPrimary
                                                            : colorScheme
                                                                  .onSurfaceVariant)
                                                        .withValues(alpha: 0.7),
                                              ),
                                            ),
                                          ),
                                        Text(
                                          timeStr,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color:
                                                (isMe
                                                        ? colorScheme.onPrimary
                                                        : colorScheme
                                                              .onSurfaceVariant)
                                                    .withValues(alpha: 0.7),
                                          ),
                                        ),
                                        if (isMe) ...[
                                          const SizedBox(width: 4),
                                          Icon(
                                            Icons.done_all_rounded,
                                            size: 14,
                                            color: colorScheme.onPrimary
                                                .withValues(alpha: 0.7),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // Message Input Bar
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                border: Border(
                  top: BorderSide(
                    color: colorScheme.outlineVariant.withValues(alpha: 0.5),
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
                        decoration: InputDecoration(
                          hintText: l10n.typeMessageHint,
                          hintStyle: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 10,
                          ),
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
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.send_rounded, size: 20),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
