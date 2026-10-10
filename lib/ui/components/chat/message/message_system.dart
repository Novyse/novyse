import 'package:flutter/material.dart';
import 'package:novyse/core/utils/platform.dart';

/// Displays system messages (date separators, join/leave notifications, etc.)
class MessageSystem extends StatefulWidget {
  const MessageSystem({
    super.key,
    required this.type,
    required this.data,
    this.onOpenContextMenu,
  });

  /// Type of system message: 'date', 'system', or 'separator-with-lines'.
  final String type;

  /// The text content or data for the system message.
  final String data;

  final void Function(Offset position)? onOpenContextMenu;

  @override
  State<MessageSystem> createState() => _MessageSystemState();
}

class _MessageSystemState extends State<MessageSystem> {
  Offset _lastTapPosition = Offset.zero;

  @override
  Widget build(BuildContext context) {
    switch (widget.type) {
      case 'date':
        return _buildPill(context);
      case 'system':
        return _buildInteractivePill(context);
      case 'separator-with-lines':
        return _buildSeparatorWithLines(context);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildInteractivePill(BuildContext context) {
    if (widget.onOpenContextMenu == null) {
      return _buildPill(context);
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Center(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTapDown: (details) => _lastTapPosition = details.globalPosition,
          onSecondaryTapDown: (details) =>
              _lastTapPosition = details.globalPosition,
          onSecondaryTap: () {
            widget.onOpenContextMenu?.call(_lastTapPosition);
          },
          onTap: () {
            if (currentPlatform == AppPlatform.mobile) {
              widget.onOpenContextMenu?.call(_lastTapPosition);
            }
          },
          onLongPress: () {
            widget.onOpenContextMenu?.call(_lastTapPosition);
          },
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 5),
            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 5),
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Text(
              widget.data,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPill(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 5),
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 5),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Text(
          widget.data,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }

  Widget _buildSeparatorWithLines(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final lineColor = colorScheme.surfaceContainerHighest;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 15),
      child: Row(
        children: [
          Expanded(child: Container(height: 0.5, color: lineColor)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 5),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.7,
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Text(
                widget.data,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ),
          Expanded(child: Container(height: 0.5, color: lineColor)),
        ],
      ),
    );
  }
}
