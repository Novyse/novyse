import 'package:flutter/material.dart';

class MessageText extends StatelessWidget {
  const MessageText({
    super.key,
    required this.content,
    this.isSender = false,
    this.isSelected = false,
  });

  final String content;
  final bool isSender;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    if (content.trim().isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final textColor = isSender
        ? theme.colorScheme.onPrimary
        : theme.colorScheme.onSurface;

    return SelectableText(
      content,
      style: TextStyle(fontSize: 15, height: 1.35, color: textColor),
    );
  }
}
