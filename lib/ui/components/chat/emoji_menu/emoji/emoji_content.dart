import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_recents_store.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_section_list.dart';

/// Display mode for [EmojiContent].
///
/// - [full]: single scrollable list (recents + nine categories + search).
///   Used in the emoji menu tab.
/// - [quick]: compact row used by the future reaction menu
///   (recent emojis first, then defaults + expand button). Kept here so
///   `ReactionMenu` can reuse the same component without depending on chat
///   draft state.
enum EmojiContentMode { full, quick }

/// Reusable emoji picker content.
///
/// When [textEditingController] is provided (chat input case), the picked
/// emoji is inserted at the cursor and [onEmojiSelected] fires as an
/// additional notification hook (the draft store syncs via its own
/// controller listener). When null (future reaction case), only
/// [onEmojiSelected] fires. Every pick is saved to recents.
class EmojiContent extends ConsumerStatefulWidget {
  const EmojiContent({
    super.key,
    required this.onEmojiSelected,
    this.textEditingController,
    this.mode = EmojiContentMode.full,
    this.onExpandMenu,
    this.height = 320,
  });

  final ValueChanged<String> onEmojiSelected;
  final TextEditingController? textEditingController;
  final EmojiContentMode mode;
  final VoidCallback? onExpandMenu;

  /// Kept for API compatibility (previously sized the library picker);
  /// the custom list is flex-sized by its parent.
  final double height;

  /// Fallback quick emojis shown after the user's recents, mirroring legacy.
  static const quickEmojis = ['❤️', '👍', '🔥'];

  @override
  ConsumerState<EmojiContent> createState() => _EmojiContentState();
}

class _EmojiContentState extends ConsumerState<EmojiContent> {
  void _handleSelected(String char) {
    final controller = widget.textEditingController;
    if (controller != null) {
      final text = controller.text;
      final selection = controller.selection;
      final start = selection.isValid
          ? selection.start.clamp(0, text.length)
          : text.length;
      final end = selection.isValid
          ? selection.end.clamp(0, text.length)
          : text.length;
      controller.value = TextEditingValue(
        text: text.replaceRange(start, end, char),
        selection: TextSelection.collapsed(offset: start + char.length),
      );
    }
    ref.read(emojiRecentsProvider.notifier).push(char);
    widget.onEmojiSelected(char);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.mode == EmojiContentMode.quick) {
      return _QuickEmojiRow(
        onSelect: _handleSelected,
        onExpand: widget.onExpandMenu,
      );
    }
    return EmojiSectionList(onSelect: _handleSelected);
  }
}

class _QuickEmojiRow extends ConsumerWidget {
  const _QuickEmojiRow({required this.onSelect, this.onExpand});

  final ValueChanged<String> onSelect;
  final VoidCallback? onExpand;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final recents = ref.watch(emojiRecentsProvider);
    final displayed = <String>{
      ...recents,
      ...EmojiContent.quickEmojis,
    }.take(3).toList();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final emoji in displayed)
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => onSelect(emoji),
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: Text(emoji, style: Theme.of(context).textTheme.bodyLarge),
            ),
          ),
        if (onExpand != null)
          IconButton(
            icon: Icon(Icons.expand_more, color: colorScheme.onSurfaceVariant),
            onPressed: onExpand,
            splashRadius: 20,
          ),
      ],
    );
  }
}
