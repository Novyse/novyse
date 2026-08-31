import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:novyse/core/l10n/l10n.dart';

class MessageTimestamp extends StatelessWidget {
  const MessageTimestamp({
    super.key,
    required this.createdAt,
    this.isSender = false,
    this.hasBeenRead = false,
    this.isEdited = false,
    this.isPinned = false,
    this.replyCount = 0,
    this.compact = false,
  });

  final DateTime createdAt;
  final bool isSender;
  final bool hasBeenRead;
  final bool isEdited;
  final bool isPinned;
  final int replyCount;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context);

    final textColor = isSender
        ? colorScheme.onPrimary.withValues(alpha: 0.75)
        : colorScheme.onSurfaceVariant.withValues(alpha: 0.75);

    final timeStr = DateFormat('HH:mm').format(createdAt.toLocal());

    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: isSender ? Alignment.centerRight : Alignment.centerLeft,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (replyCount > 0) ...[
            Icon(Icons.reply_rounded, size: 13, color: textColor),
            const SizedBox(width: 2),
            Text(
              '$replyCount',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
            const SizedBox(width: 4),
          ],
          if (isPinned) ...[
            Icon(Icons.push_pin_rounded, size: 12, color: textColor),
            const SizedBox(width: 4),
          ],
          if (isEdited) ...[
            Text(
              l10n?.edited ?? 'edited',
              style: TextStyle(fontSize: 10, color: textColor),
            ),
            const SizedBox(width: 4),
          ],
          Text(
            timeStr,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: textColor,
            ),
          ),
          if (isSender) ...[
            const SizedBox(width: 4),
            Icon(
              hasBeenRead ? Icons.done_all_rounded : Icons.check_rounded,
              size: 14,
              color: textColor,
            ),
          ],
        ],
      ),
    );
  }
}
