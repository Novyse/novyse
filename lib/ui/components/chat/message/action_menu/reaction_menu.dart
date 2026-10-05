import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_content.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_recents_store.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Quick reaction header shown above the message action menu
class ReactionMenu extends ConsumerStatefulWidget {
  const ReactionMenu({
    super.key,
    required this.onSelectEmoji,
    this.width = 175.0,
    this.expandedHeight = 306.0,
    this.onExpandChanged,
  });

  final ValueChanged<String> onSelectEmoji;
  final double width;
  final double expandedHeight;
  final ValueChanged<bool>? onExpandChanged;

  @override
  ConsumerState<ReactionMenu> createState() => _ReactionMenuState();
}

class _ReactionMenuState extends ConsumerState<ReactionMenu> {
  bool _isExpanded = false;

  void _toggleExpand() {
    setState(() {
      _isExpanded = !_isExpanded;
    });
    widget.onExpandChanged?.call(_isExpanded);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final recents = ref.watch(emojiRecentsProvider);
    final displayed = <String>{
      ...recents,
      ...EmojiContent.quickEmojis,
    }.take(3).toList();

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppMenuTokens.borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: AppMenuTokens.blurSigma,
          sigmaY: AppMenuTokens.blurSigma,
        ),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOutCubic,
          clipBehavior: Clip.hardEdge,
          width: widget.width,
          height: _isExpanded ? widget.expandedHeight : 44,
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(
              alpha: _isExpanded ? 0.94 : AppMenuTokens.cardOpacity,
            ),
            borderRadius: BorderRadius.circular(AppMenuTokens.borderRadius),
            border: Border.all(
              color: colorScheme.outlineVariant.withValues(
                alpha: AppMenuTokens.borderOpacity,
              ),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 18,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: _isExpanded
              ? OverflowBox(
                  minHeight: 0,
                  maxHeight: widget.expandedHeight,
                  alignment: Alignment.topCenter,
                  child: SizedBox(
                    height: widget.expandedHeight,
                    child: EmojiContent(
                      mode: EmojiContentMode.full,
                      onEmojiSelected: widget.onSelectEmoji,
                    ),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    for (final emoji in displayed)
                      InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => widget.onSelectEmoji(emoji),
                        child: Container(
                          width: 36,
                          height: 36,
                          alignment: Alignment.center,
                          child: Text(
                            emoji,
                            style: const TextStyle(fontSize: 19),
                          ),
                        ),
                      ),
                    InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: _toggleExpand,
                      child: Container(
                        width: 36,
                        height: 36,
                        alignment: Alignment.center,
                        child: AppHugeIcon(
                          icon: HugeIcons.strokeRoundedArrowDown01,
                          size: 18,
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
