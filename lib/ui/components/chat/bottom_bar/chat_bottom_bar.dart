import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/chat/bottom_bar/chat_ime_panel.dart';
import 'package:novyse/ui/components/chat/bottom_bar/default/default_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/no_write_bottom_bar.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';

/// Chat composer; on mobile hosts the IME/emoji panel via [ChatImePanel].
class ChatBottomBar extends ConsumerStatefulWidget {
  const ChatBottomBar({
    super.key,
    required this.chatUUID,
    this.subID = 0,
    this.readOnly = false,
    this.onEmojiOpenChanged,
  });

  final String chatUUID;
  final int subID;
  final bool readOnly;
  final ValueChanged<bool>? onEmojiOpenChanged;

  @override
  ConsumerState<ChatBottomBar> createState() => ChatBottomBarState();
}

class ChatBottomBarState extends ConsumerState<ChatBottomBar> {
  final FocusNode _focusNode = FocusNode();
  final GlobalKey<ChatImePanelState> _imeKey = GlobalKey<ChatImePanelState>();
  bool _desktopEmojiOpen = false;

  bool get isEmojiOpen =>
      _imeKey.currentState?.isEmojiOpen ?? _desktopEmojiOpen;

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> hideAccessoryPanel({bool animated = true}) async {
    final ime = _imeKey.currentState;
    if (ime != null) {
      await ime.hideAccessoryPanel(animated: animated);
      return;
    }
    if (_desktopEmojiOpen) {
      setState(() => _desktopEmojiOpen = false);
      widget.onEmojiOpenChanged?.call(false);
    }
    if (_focusNode.hasFocus) _focusNode.unfocus();
  }

  void _toggleDesktopEmoji() {
    final opening = !_desktopEmojiOpen;
    setState(() => _desktopEmojiOpen = opening);
    widget.onEmojiOpenChanged?.call(opening);
    if (opening) {
      _focusNode.unfocus();
    } else {
      _focusNode.requestFocus();
    }
  }

  Widget _composer({required bool emojiOpen, required VoidCallback onToggle}) {
    return ProgressiveOpacityBackground(
      direction: ProgressiveOpacityDirection.bottomToTop,
      applySafeArea: currentPlatform != AppPlatform.mobile,
      padding: currentPlatform == AppPlatform.mobile
          ? EdgeInsets.fromLTRB(
              12,
              0,
              12,
              12 + MediaQuery.viewPaddingOf(context).bottom,
            )
          : null,
      child: widget.readOnly
          ? const NoWriteBottomBar()
          : DefaultBottomBar(
              chatUUID: widget.chatUUID,
              subID: widget.subID,
              focusNode: _focusNode,
              isEmojiMenuOpen: emojiOpen,
              onToggleEmojiMenu: onToggle,
              onCloseEmojiMenu: () => unawaited(hideAccessoryPanel()),
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (currentPlatform != AppPlatform.mobile || widget.readOnly) {
      return _composer(
        emojiOpen: _desktopEmojiOpen,
        onToggle: _toggleDesktopEmoji,
      );
    }

    return ChatImePanel(
      key: _imeKey,
      chatUUID: widget.chatUUID,
      subID: widget.subID,
      focusNode: _focusNode,
      onEmojiOpenChanged: widget.onEmojiOpenChanged,
      composerBuilder: (emojiOpen, onToggle) => _composer(
        emojiOpen: emojiOpen,
        onToggle: onToggle,
      ),
    );
  }
}
