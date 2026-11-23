import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_content.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji_menu_tab.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_picker.dart';
import 'package:novyse/ui/components/chat/emoji_menu/sticker/sticker_content.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/switch/segmented_switch.dart';

enum EmojiMenuPanelStyle { floating, sheet }

/// Emoji/GIF/sticker panel body (mobile sheet or desktop overlay).
class EmojiMenuPanel extends ConsumerStatefulWidget {
  const EmojiMenuPanel({
    super.key,
    this.textController,
    required this.onSelectGif,
    this.initialTab = EmojiMenuTab.emoji,
    this.height = 380,
    this.style = EmojiMenuPanelStyle.floating,
  });

  final TextEditingController? textController;
  final ValueChanged<GifItem> onSelectGif;
  final EmojiMenuTab initialTab;
  final double height;
  final EmojiMenuPanelStyle style;

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

  List<SegmentedOption<EmojiMenuTab>> _options(
    AppLocalizations l10n,
    ColorScheme scheme,
  ) => [
    for (final t in EmojiMenuTab.values)
      SegmentedOption(
        value: t,
        label: t.label(l10n),
        icon: AppHugeIcon(
          icon: t.icon,
          size: 16,
          color: t == _tab ? scheme.onPrimary : scheme.onSurfaceVariant,
        ),
      ),
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final isSheet = widget.style == EmojiMenuPanelStyle.sheet;
    final tabChrome = isSheet ? 56.0 : 74.0;

    final body = Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(12, isSheet ? 4 : 10, 12, 8),
          child: SegmentedSwitch<EmojiMenuTab>(
            options: _options(l10n, colorScheme),
            value: _tab,
            onChanged: (t) => setState(() => _tab = t),
          ),
        ),
        Expanded(
          child: switch (_tab) {
            EmojiMenuTab.emoji => EmojiContent(
              textEditingController: widget.textController,
              onEmojiSelected: (_) {},
              height: widget.height - tabChrome,
            ),
            EmojiMenuTab.sticker => const StickerContent(),
            EmojiMenuTab.gif => GifPicker(onSelectGif: widget.onSelectGif),
          },
        ),
      ],
    );

    if (isSheet) return body;

    return Container(
      height: widget.height,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadius.lg),
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
      child: body,
    );
  }
}

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
