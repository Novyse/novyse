import 'package:flutter/material.dart';
import 'package:novyse/core/stores/message_store.dart';

/// Displays a reply preview (quoted message) inside a message bubble.
class MessageReply extends StatelessWidget {
  const MessageReply({
    super.key,
    required this.senderName,
    required this.message,
    this.chatUUID,
    this.messageID,
    this.rangeStart,
    this.rangeEnd,
    this.onTap,
  });

  final String senderName;
  final MessageModel message;
  final String? chatUUID;
  final int? messageID;
  final int? rangeStart;
  final int? rangeEnd;
  final VoidCallback? onTap;

  bool get _isQuote => rangeStart != null && rangeEnd != null;

  String get _displayText {
    final content = message.content ?? '';
    if (_isQuote && content.isNotEmpty) {
      final start = rangeStart!.clamp(0, content.length);
      final end = rangeEnd!.clamp(start, content.length);
      return content.substring(start, end);
    }
    return content;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Container(
          constraints: const BoxConstraints(minWidth: 220),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(10)),
          clipBehavior: Clip.hardEdge,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Accent bar
                Container(width: 4, color: colorScheme.primary),
                // Content
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 5,
                    ),
                    color: colorScheme.secondary.withValues(alpha: 0.12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Header row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                senderName,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: colorScheme.primary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (_isQuote)
                              Icon(
                                Icons.format_quote_rounded,
                                size: 14,
                                color: colorScheme.onSurfaceVariant,
                              ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        // Message preview
                        Text(
                          _displayText,
                          style: TextStyle(
                            fontSize: 12,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
