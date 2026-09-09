import 'package:flutter/material.dart';
import 'package:novyse/ui/components/chat/bottom_bar/attach_menu/attach_menu.dart';

/// Non-modal floating layer hosting the attach menu.
class AttachMenuOverlay extends StatelessWidget {
  const AttachMenuOverlay({
    super.key,
    required this.link,
    required this.chatUUID,
    required this.onClose,
  });

  final LayerLink link;
  final String chatUUID;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Transparent tap-outside-to-dismiss barrier. No dimming.
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onClose,
            child: Container(color: Colors.transparent),
          ),
        ),
        CompositedTransformFollower(
          link: link,
          showWhenUnlinked: false,
          targetAnchor: Alignment.topLeft,
          followerAnchor: Alignment.bottomLeft,
          offset: const Offset(0, -8),
          child: AttachMenuPopover(chatUUID: chatUUID, onClose: onClose),
        ),
      ],
    );
  }
}
