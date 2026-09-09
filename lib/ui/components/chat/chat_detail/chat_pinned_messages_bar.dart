import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/message_format.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Interactive component displaying pinned messages within the chat sub-header bar.
/// Supports cycling between multiple pinned messages and jumping to target message.
class ChatPinnedMessagesBar extends ConsumerStatefulWidget {
  const ChatPinnedMessagesBar({super.key, required this.chatUUID});

  final String chatUUID;

  @override
  ConsumerState<ChatPinnedMessagesBar> createState() =>
      _ChatPinnedMessagesBarState();
}

class _ChatPinnedMessagesBarState extends ConsumerState<ChatPinnedMessagesBar> {
  int _currentIndex = 0;
  int _prevLength = 0;
  final Set<String> _requestedMessageIds = {};

  @override
  void didUpdateWidget(covariant ChatPinnedMessagesBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID) {
      _currentIndex = 0;
      _prevLength = 0;
      _requestedMessageIds.clear();
    }
  }

  void _handleNext(int length) {
    if (length <= 1) return;
    setState(() {
      _currentIndex = (_currentIndex + 1) % length;
    });
  }

  void _handlePrev(int length) {
    if (length <= 1) return;
    setState(() {
      _currentIndex = (_currentIndex - 1 + length) % length;
    });
  }

  @override
  Widget build(BuildContext context) {
    final chat = ref.watch(chatProvider(widget.chatUUID));
    final pinnedMessages = chat?.pinnedMessages ?? const [];

    if (pinnedMessages.isEmpty) {
      return const SizedBox.shrink();
    }

    // Adjust index if list changed
    if (pinnedMessages.length > _prevLength) {
      _currentIndex = pinnedMessages.length - 1;
    } else if (pinnedMessages.length < _prevLength) {
      _currentIndex = _currentIndex.clamp(0, pinnedMessages.length - 1);
    }
    _prevLength = pinnedMessages.length;
    _currentIndex = _currentIndex.clamp(0, pinnedMessages.length - 1);

    final currentPin = pinnedMessages[_currentIndex];
    final subID = (currentPin['subID'] as int?) ?? 0;
    final messageID = currentPin['messageID'];
    final messageIdStr = messageID?.toString() ?? '';

    // Watch messages from Riverpod store
    final memoryMessages = ref.watch(
      chatMessagesProvider((chatUUID: widget.chatUUID, subID: subID))
          .select((s) => s.messages),
    );
    final inMemMsg = memoryMessages
        .where((m) => m.id.toString() == messageIdStr)
        .firstOrNull;

    // If message is not yet in the active Riverpod message list, request it through Riverpod store notifier
    if (inMemMsg == null && messageID != null) {
      final reqKey = '$subID-$messageIdStr';
      if (!_requestedMessageIds.contains(reqKey)) {
        _requestedMessageIds.add(reqKey);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            ref
                .read(
                  chatMessagesProvider((
                    chatUUID: widget.chatUUID,
                    subID: subID,
                  )).notifier,
                )
                .fetchMessageById(messageID);
          }
        });
      }
    }

    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;

    String contentText;
    if (inMemMsg != null) {
      final userState = ref.watch(userStoreProvider);
      final formatted = formatMessage(
        inMemMsg,
        localUserUUID: userState.localUserUUID,
        getUser: (uuid) => userState.users[uuid]?.toMap(),
      );
      final text = formatted['content']?.toString().trim();
      contentText = (text != null && text.isNotEmpty)
          ? text
          : l10n.pinnedMessage;
    } else {
      contentText = '...';
    }

    final hasMultiple = pinnedMessages.length > 1;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          ref
              .read(activeChatProvider.notifier)
              .jumpToMessage(messageIdStr, subID: subID);
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            children: [
              AppHugeIcon(
                icon: HugeIcons.strokeRoundedPin02,
                size: 18,
                color: scheme.primary,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          l10n.pinnedMessage,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: scheme.primary,
                          ),
                        ),
                        if (hasMultiple) ...[
                          const SizedBox(width: 6),
                          Text(
                            '${_currentIndex + 1} / ${pinnedMessages.length}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 1),
                    Text(
                      contentText,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        color: scheme.onSurface.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
              if (hasMultiple) ...[
                const SizedBox(width: 6),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 28,
                    minHeight: 28,
                  ),
                  icon: AppHugeIcon(
                    icon: HugeIcons.strokeRoundedArrowLeft02,
                    size: 16,
                    color: scheme.onSurfaceVariant,
                  ),
                  onPressed: () => _handlePrev(pinnedMessages.length),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 28,
                    minHeight: 28,
                  ),
                  icon: AppHugeIcon(
                    icon: HugeIcons.strokeRoundedArrowRight02,
                    size: 16,
                    color: scheme.onSurfaceVariant,
                  ),
                  onPressed: () => _handleNext(pinnedMessages.length),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
