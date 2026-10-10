import 'package:flutter/material.dart';
import 'package:novyse/core/utils/platform.dart';

/// Gesture logic shared by the message bubble ([InkWell]) and the full-row
/// background hit area ([MessageRowBackground]).
class MessageRowGestures {
  const MessageRowGestures({
    required this.isSelectionMode,
    required this.onSelectionToggle,
    required this.onTap,
    required this.onLongPress,
    required this.onOpenContextMenu,
  });

  final bool isSelectionMode;
  final VoidCallback? onSelectionToggle;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final void Function(Offset position, String? selectedText)? onOpenContextMenu;

  void handleTap({required Offset position, required String? selectedText}) {
    if (isSelectionMode) {
      onSelectionToggle?.call();
    } else if (currentPlatform == AppPlatform.mobile) {
      onOpenContextMenu?.call(position, selectedText);
    } else {
      onTap?.call();
    }
  }

  void handleLongPress() {
    if (onSelectionToggle != null) {
      onSelectionToggle!();
    } else {
      onLongPress?.call();
    }
  }

  void handleSecondaryTap({
    required Offset position,
    required String? selectedText,
  }) {
    onOpenContextMenu?.call(position, selectedText);
  }
}

/// Transparent background detector for a message row.
///
/// Must be placed as the first child of the row's [Stack]:
/// it fills exactly the laid-out row (full width, bubble height) and sits
/// behind the bubble row in hit-test order.
///
/// - Taps on empty space miss the bubble subtree and reach this detector.
/// - Taps on the bubble, avatar or any interactive child (reply preview,
///   reactions, links) hit those first, so this detector never double-fires.
class MessageRowBackground extends StatelessWidget {
  const MessageRowBackground({
    super.key,
    required this.gestures,
    required this.onRecordPosition,
    required this.readPosition,
    required this.readSelectedText,
  });

  final MessageRowGestures gestures;
  final ValueChanged<Offset> onRecordPosition;
  final Offset Function() readPosition;
  final String? Function() readSelectedText;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTapDown: (details) => onRecordPosition(details.globalPosition),
        onSecondaryTapDown: (details) =>
            onRecordPosition(details.globalPosition),
        onSecondaryTap: () => gestures.handleSecondaryTap(
          position: readPosition(),
          selectedText: readSelectedText(),
        ),
        onTap: () => gestures.handleTap(
          position: readPosition(),
          selectedText: readSelectedText(),
        ),
        onLongPress: gestures.handleLongPress,
        child: Container(color: Colors.transparent),
      ),
    );
  }
}
