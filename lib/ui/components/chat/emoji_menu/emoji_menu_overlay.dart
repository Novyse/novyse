import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_content.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji_menu_tab.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_picker.dart';
import 'package:novyse/ui/components/chat/emoji_menu/sticker/sticker_content.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Content panel of the emoji menu (tab bar + body).
///
/// Used inline on mobile and inside [EmojiMenuOverlay] on desktop.
/// Stays dumb: emoji insertion happens via [textController] binding,
/// GIF delivery via [onSelectGif] (parent sends + closes).
class EmojiMenuPanel extends ConsumerStatefulWidget {
  const EmojiMenuPanel({
    super.key,
    this.textController,
    required this.onSelectGif,
    this.initialTab = EmojiMenuTab.emoji,
    this.height = 380,
  });

  final TextEditingController? textController;
  final ValueChanged<GifItem> onSelectGif;
  final EmojiMenuTab initialTab;
  final double height;

  @override
  ConsumerState<EmojiMenuPanel> createState() => _EmojiMenuPanelState();
}

class _EmojiMenuPanelState extends ConsumerState<EmojiMenuPanel> {
  late EmojiMenuTab _tab;

  @override
  void initState() {
    super.initState();
    _tab = widget.initialTab;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      height: widget.height,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
            child: SegmentedButton<EmojiMenuTab>(
              segments: [
                for (final t in EmojiMenuTab.values)
                  ButtonSegment(
                    value: t,
                    label: Text(t.label(l10n)),
                    icon: AppHugeIcon(icon: t.icon, size: 16),
                  ),
              ],
              selected: {_tab},
              onSelectionChanged: (s) => setState(() => _tab = s.first),
              showSelectedIcon: false,
              style: SegmentedButton.styleFrom(
                visualDensity: VisualDensity.compact,
              ),
            ),
          ),
          Expanded(
            // Lazy body (like legacy renderContent): only the active tab is
            // mounted, avoiding eager EmojiPicker init + GIF fetch costs.
            child: switch (_tab) {
              EmojiMenuTab.emoji => EmojiContent(
                textEditingController: widget.textController,
                onEmojiSelected: (_) {},
                height: widget.height - 70,
              ),
              EmojiMenuTab.sticker => const StickerContent(),
              EmojiMenuTab.gif => GifPicker(onSelectGif: widget.onSelectGif),
            },
          ),
        ],
      ),
    );
  }
}

/// Non-modal floating layer hosting the emoji menu (desktop/web).
///
/// Mirrors [AttachMenuOverlay]: transparent tap-outside-to-dismiss barrier
/// plus a follower anchored to the bottom bar.
class EmojiMenuOverlay extends StatelessWidget {
  const EmojiMenuOverlay({
    super.key,
    required this.link,
    required this.textController,
    required this.onSelectGif,
    required this.onClose,
  });

  final LayerLink link;
  final TextEditingController? textController;
  final ValueChanged<GifItem> onSelectGif;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final panelWidth = width < 392 ? width - 32 : 360.0;
    return Stack(
      children: [
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
          targetAnchor: Alignment.topRight,
          followerAnchor: Alignment.bottomRight,
          offset: const Offset(0, -8),
          child: SizedBox(
            width: panelWidth,
            child: EmojiMenuPanel(
              textController: textController,
              onSelectGif: onSelectGif,
            ),
          ),
        ),
      ],
    );
  }
}
