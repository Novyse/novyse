import 'package:flutter/material.dart';

/// Displays system messages (date separators, join/leave notifications, etc.)
class MessageSystem extends StatelessWidget {
  const MessageSystem({super.key, required this.type, required this.data});

  /// Type of system message: 'date', 'system', or 'separator-with-lines'.
  final String type;

  /// The text content or data for the system message.
  final String data;

  @override
  Widget build(BuildContext context) {
    switch (type) {
      case 'date':
        return _buildPill(context);
      case 'system':
        return _buildPill(context);
      case 'separator-with-lines':
        return _buildSeparatorWithLines(context);
      default:
        return const SizedBox.shrink();
    }
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
          borderRadius: BorderRadius.circular(25),
        ),
        child: Text(
          data,
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
                borderRadius: BorderRadius.circular(25),
              ),
              child: Text(
                data,
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
